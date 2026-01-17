pipeline {
    agent any

    environment {
        DOCKER_HUB_USER = '1t1scool' 
        IMAGE_NAME = 'cat-bot'
        IMAGE_TAG = "${BUILD_NUMBER}"
        FULL_IMAGE = "${DOCKER_HUB_USER}/${IMAGE_NAME}:${IMAGE_TAG}"
        LATEST_IMAGE = "${DOCKER_HUB_USER}/${IMAGE_NAME}:latest"
        DOCKER_HUB_CREDS = 'dockerhub' 
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Push') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${DOCKER_HUB_CREDS}", 
                                 usernameVariable: 'USER', 
                                 passwordVariable: 'PASS')]) {
                    sh """
                        echo "🐳 Building Docker image..."
                        docker build -t ${FULL_IMAGE} -t ${LATEST_IMAGE} .

                        echo "🔑 Logging into Docker Hub..."
                        echo \$PASS | docker login -u \$USER --password-stdin

                        echo "📤 Pushing images..."
                        docker push ${FULL_IMAGE}
                        docker push ${LATEST_IMAGE}
                    """
                }
            }
        }

        stage('Update Manifests') {
            steps {
                sh """
                    echo "📝 Updating image tag in deployment.yaml..."
                    sed -i "s|image: .*|image: ${FULL_IMAGE}|g" kubernetes/deployment.yaml
                """
            }
        }

        stage('Deploy to K8s') {
            steps {
                sh """
                    echo "🚀 Deploying to Kubernetes..."
                    kubectl apply -f kubernetes/pvc.yaml
                    kubectl apply -f kubernetes/deployment.yaml
                """
            }
        }
    }
    
    post {
        always {
            sh "docker logout" 
            sh "docker rmi ${FULL_IMAGE} ${LATEST_IMAGE} || true"
        }
    }
}