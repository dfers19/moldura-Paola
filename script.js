class CameraApp {
            constructor() {
                this.video = document.getElementById('video');
                this.canvas = document.getElementById('canvas');
                this.ctx = this.canvas.getContext('2d');
                this.captureBtn = document.getElementById('captureBtn');
                this.switchCameraBtn = document.getElementById('switchCamera');
                this.fullscreenBtn = document.getElementById('fullscreenBtn');
                this.fullscreenNotice = document.getElementById('fullscreenNotice');
                this.photoPreview = document.getElementById('photoPreview');
                this.photoImg = document.getElementById('photoImg');
                this.savePhotoBtn = document.getElementById('savePhoto');
                this.retakePhotoBtn = document.getElementById('retakePhoto');
                this.errorDiv = document.getElementById('error');
                this.frameImage = document.getElementById('frameImage');
                
                this.currentStream = null;
                this.facingMode = 'user';
                this.isCapturing = false;
                this.isFullscreen = false;
                
                this.init();
            }

            async init() {
                // Previne zoom em dispositivos móveis
                document.addEventListener('touchstart', this.handleTouchStart, { passive: false });
                document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
                
                // Monitora mudanças na tela cheia
                document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
                document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
                document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
                document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
                
                await this.startCamera();
                this.setupEventListeners();
                
                // Tenta entrar em tela cheia automaticamente no mobile
                this.tryAutoFullscreen();
            }

            handleTouchStart(e) {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }

            handleTouchMove(e) {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }

            tryAutoFullscreen() {
                // Tenta entrar em tela cheia automaticamente em dispositivos móveis (exceto iOS)
                if (this.isMobile() && !this.isIOS() && !this.isFullscreen) {
                    setTimeout(() => {
                        this.toggleFullscreen();
                    }, 1000);
                }
            }

            isMobile() {
                return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            }

            isIOS() {
                return /iPad|iPhone|iPod/.test(navigator.userAgent);
            }

            setupEventListeners() {
                // Evento de captura
                this.captureBtn.addEventListener('click', (e) => {
                    console.log('Click detectado no botão de captura');
                    e.preventDefault();
                    e.stopPropagation();
                    this.capturePhoto();
                });
                
                this.captureBtn.addEventListener('touchstart', (e) => {
                    console.log('TouchStart detectado no botão de captura');
                    e.preventDefault();
                    e.stopPropagation();
                });
                
                this.captureBtn.addEventListener('touchend', (e) => {
                    console.log('TouchEnd detectado no botão de captura');
                    e.preventDefault();
                    e.stopPropagation();
                    this.capturePhoto();
                });
                
                // Evento de trocar câmera
                this.switchCameraBtn.addEventListener('click', (e) => {
                    console.log('Click detectado no botão trocar câmera');
                    e.preventDefault();
                    e.stopPropagation();
                    this.switchCamera();
                });
                
                this.switchCameraBtn.addEventListener('touchend', (e) => {
                    console.log('TouchEnd detectado no botão trocar câmera');
                    e.preventDefault();
                    e.stopPropagation();
                    this.switchCamera();
                });

                // Evento de tela cheia - desabilitado no iOS
                if (!this.isIOS()) {
                    this.fullscreenBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.toggleFullscreen();
                    });

                    this.fullscreenBtn.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.toggleFullscreen();
                    });
                } else {
                    // No iOS, esconde o botão de tela cheia
                    this.fullscreenBtn.style.display = 'none';
                }

                // Clique na notificação para sair da tela cheia
                this.fullscreenNotice.addEventListener('click', () => {
                    this.exitFullscreen();
                });
                
                this.savePhotoBtn.addEventListener('click', () => this.savePhoto());
                this.retakePhotoBtn.addEventListener('click', () => this.retakePhoto());

                // Previne comportamentos padrão
                document.addEventListener('contextmenu', e => e.preventDefault());
                document.addEventListener('selectstart', e => e.preventDefault());
            }

            toggleFullscreen() {
                if (!this.isFullscreen) {
                    this.enterFullscreen();
                } else {
                    this.exitFullscreen();
                }
            }

            enterFullscreen() {
                const element = document.documentElement;
                
                if (element.requestFullscreen) {
                    element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                } else if (element.mozRequestFullScreen) {
                    element.mozRequestFullScreen();
                } else if (element.msRequestFullscreen) {
                    element.msRequestFullscreen();
                }
            }

            exitFullscreen() {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }

            handleFullscreenChange() {
                this.isFullscreen = !!(document.fullscreenElement || 
                                       document.webkitFullscreenElement || 
                                       document.mozFullScreenElement || 
                                       document.msFullscreenElement);
                
                if (this.isFullscreen) {
                    this.fullscreenBtn.innerHTML = '⛶';
                    this.fullscreenBtn.title = 'Sair da tela cheia';
                    this.fullscreenNotice.style.display = 'block';
                    
                    // Esconde a notificação após 3 segundos
                    setTimeout(() => {
                        this.fullscreenNotice.style.display = 'none';
                    }, 3000);
                } else {
                    this.fullscreenBtn.innerHTML = '⛶';
                    this.fullscreenBtn.title = 'Tela cheia';
                    this.fullscreenNotice.style.display = 'none';
                }
            }

            async startCamera() {
                try {
                    if (this.currentStream) {
                        this.currentStream.getTracks().forEach(track => track.stop());
                    }

                    // Detecta dispositivo para otimizar qualidade
                    const isWebcam = !this.isMobile();
                    
                    let constraints;
                    
                    if (isWebcam) {
                        // Configurações otimizadas para WEBCAM (PC)
                        constraints = {
                            video: {
                                width: { min: 640, ideal: 1280, max: 1920 },
                                height: { min: 480, ideal: 720, max: 1080 },
                                frameRate: { min: 24, ideal: 30 }
                            },
                            audio: false
                        };
                    } else {
                        // Configurações otimizadas para CÂMERA MÓVEL - SEM ZOOM
                        constraints = {
                            video: {
                                facingMode: this.facingMode,
                                width: { min: 640, ideal: 1280, max: 1920 },
                                height: { min: 480, ideal: 720, max: 1080 },
                                frameRate: { min: 24, ideal: 30 }
                                // Removido aspectRatio para evitar zoom forçado
                            },
                            audio: false
                        };
                    }

                    console.log('📱 Dispositivo:', isWebcam ? 'Webcam (PC)' : 'Câmera móvel');
                    console.log('⚙️ Configurações:', constraints);

                    this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                    this.video.srcObject = this.currentStream;
                    
                    // Log da qualidade real obtida
                    this.video.onloadedmetadata = () => {
                        console.log('📸 Qualidade real da câmera:', {
                            width: this.video.videoWidth,
                            height: this.video.videoHeight,
                            aspectRatio: (this.video.videoWidth / this.video.videoHeight).toFixed(3)
                        });
                    };
                    
                    this.video.style.transform = this.facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
                    this.hideError();
                    
                } catch (error) {
                    console.error('Erro ao acessar a câmera:', error);
                    
                    // Fallback mais básico e confiável
                    try {
                        const fallbackConstraints = {
                            video: {
                                width: { min: 320, ideal: 640 },
                                height: { min: 240, ideal: 480 }
                            },
                            audio: false
                        };
                        
                        console.log(' Tentando configurações básicas...');
                        this.currentStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                        this.video.srcObject = this.currentStream;
                        this.video.style.transform = this.facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
                        this.hideError();
                    } catch (fallbackError) {
                        console.error('Erro também no fallback:', fallbackError);
                        this.showError();
                    }
                }
            }

            async switchCamera() {
                this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
                await this.startCamera();
            }

            capturePhoto() {
                console.log('=== INICIANDO CAPTURA DE FOTO ===');
                
                if (this.isCapturing) {
                    console.log('Já está capturando, ignorando...');
                    return;
                }
                
                this.isCapturing = true;
                console.log('Flag de captura definida como true');

                // Verifica se o vídeo está disponível
                if (!this.video) {
                    console.error('Elemento de vídeo não encontrado');
                    this.isCapturing = false;
                    return;
                }

                console.log('Estado do vídeo:', {
                    readyState: this.video.readyState,
                    videoWidth: this.video.videoWidth,
                    videoHeight: this.video.videoHeight,
                    currentTime: this.video.currentTime
                });

                // Aguarda o vídeo estar pronto
                if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
                    console.log('Vídeo não está pronto, aguardando...');
                    
                    setTimeout(() => {
                        console.log('Tentando novamente após timeout...');
                        this.isCapturing = false;
                        this.capturePhoto();
                    }, 100);
                    return;
                }

                const videoWidth = this.video.videoWidth;
                const videoHeight = this.video.videoHeight;

                console.log('Dimensões originais do vídeo:', videoWidth, videoHeight);

                try {
                    // Usa as dimensões naturais do vídeo sem forçar proporção
                    const finalWidth = videoWidth;
                    const finalHeight = videoHeight;

                    console.log('Dimensões naturais do vídeo:', finalWidth, finalHeight);

                    // Define o canvas com as dimensões naturais
                    this.canvas.width = finalWidth;
                    this.canvas.height = finalHeight;
                    console.log('Canvas com dimensões naturais:', this.canvas.width, this.canvas.height);

                    // Limpa o canvas primeiro
                    this.ctx.clearRect(0, 0, finalWidth, finalHeight);

                    // MUDANÇA PRINCIPAL: Desenha o vídeo e a moldura separadamente
                    
                    // 1. Desenha o vídeo (com espelhamento se necessário)
                    this.ctx.save();
                    console.log('Desenhando vídeo...');
                    
                    if (this.facingMode === 'user') {
                        console.log('Aplicando espelhamento para vídeo da câmera frontal');
                        this.ctx.translate(finalWidth, 0);
                        this.ctx.scale(-1, 1);
                    }

                    this.ctx.drawImage(
                        this.video,
                        0, 0, videoWidth, videoHeight, // Área de origem (vídeo completo)
                        0, 0, finalWidth, finalHeight // Área de destino (canvas inteiro)
                    );
                    
                    this.ctx.restore(); // Restaura o contexto após desenhar o vídeo

                    // 2. Desenha a moldura (SEM espelhamento)
                    if (this.frameImage && this.frameImage.complete && this.frameImage.naturalWidth > 0) {
                        console.log('Aplicando moldura (sem espelhamento):', this.frameImage.naturalWidth, 'x', this.frameImage.naturalHeight);
                        // A moldura é desenhada diretamente, sem transformações
                        this.ctx.drawImage(this.frameImage, 0, 0, finalWidth, finalHeight);
                    } else {
                        console.log('Moldura não disponível ou não carregada');
                    }

                    // Converte para base64 com QUALIDADE MÁXIMA
                    console.log('Convertendo para base64 com qualidade máxima...');
                    const imageData = this.canvas.toDataURL('image/jpeg', 1.0);  // Qualidade máxima (1.0)
                    console.log('Imagem convertida com qualidade máxima, tamanho:', imageData.length);
                    
                    this.showPhotoPreview(imageData);
                    console.log('=== FOTO CAPTURADA COM SUCESSO (DIMENSÕES NATURAIS) ===');
                    
                } catch (error) {
                    console.error('Erro durante a captura:', error);
                } finally {
                    this.isCapturing = false;
                    console.log('Flag de captura resetada');
                }
            }

            showPhotoPreview(imageData) {
                this.photoImg.src = imageData;
                this.photoPreview.style.display = 'flex';
            }

            savePhoto() {
                const imageData = this.photoImg.src;
                const link = document.createElement('a');
                link.download = `foto_${new Date().getTime()}.jpg`;
                link.href = imageData;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                this.retakePhoto();
            }

            retakePhoto() {
                this.photoPreview.style.display = 'none';
            }

            showError() {
                this.errorDiv.style.display = 'block';
                this.video.style.display = 'none';
            }

            hideError() {
                this.errorDiv.style.display = 'none';
                this.video.style.display = 'block';
            }
        }

        // Inicializa o app
        document.addEventListener('DOMContentLoaded', () => {
            new CameraApp();
        });

        // Previne zoom em dispositivos móveis
        document.addEventListener('gesturestart', function (e) {
            e.preventDefault();
        });

        document.addEventListener('gesturechange', function (e) {
            e.preventDefault();
        });

        document.addEventListener('gestureend', function (e) {
            e.preventDefault();
        });