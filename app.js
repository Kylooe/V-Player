var canvas = document.getElementById("canvas"),
    bg = document.getElementById("bg");

window.onload = function() {
    var player = new Player();

    window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
    window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
    window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame;
    try {
        player.audioContext = new AudioContext();
    } catch(err) {
        alert("你的浏览器不支持Web Audio API");
        console.log(err);
    }
    console.log(player.audioContext.sampleRate);
    player.init();
    player.setFile();
    //player.controller();
    window.addEventListener("resize", function() {
         player.init();
    }, false);
};

var Player = function() {
    this.context = canvas.getContext("2d"),
    this.audioContext = null,
    this.musicFile = null,
    this.title = "",
    this.playing = 0,
    this.animation = null,
    this.visualiseMode = "normal"
};

Player.prototype = {
    init: function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        bg.height = window.innerHeight;

        switch(this.visualiseMode) {
            case "circle":
                if(this.playing) {
                    this.context.translate(canvas.width/2, canvas.height/2);
                }else {
                /* 
                    for(let i=0; i<num; i++) {
                        var value = array[i];
                        context.save();
                        context.rotate(ang*i);
                        context.fillRect(0, -value/2-r-5, width, value/2+5);
                        context.restore();
                    }*/
                }
                break;
            default: break;
        }

    },
    setFile: function() {
        var music = document.getElementById("music"),
            image = document.getElementById("image"),
            that = this;
        music.addEventListener("change", function() {
            if(music.files.length !== 0) {
                that.musicFile = music.files[0];
                that.title = that.musicFile.name;
                that.loadAudio();
            }
        }, false);
        image.addEventListener("change", function() {
            var file = image.files[0],
                fr = new FileReader();
            bg.height = window.innerHeight;
            fr.onload = function() {
                bg.src = fr.result;
            };
            if(file) {
                fr.readAsDataURL(file);
            }
        }, false);
    },
    loadAudio: function() {
        var file = this.musicFile,
            fileReader = new FileReader();
        var that = this;  // 这里将当前的this也就是Player对象赋值给that，以防下面函数中的this指代的对象改变
        fileReader.onload = function(e) {
            var src = e.target.result,
                audioContext = that.audioContext;  // 如果这里用this则指向fileReader
            audioContext.decodeAudioData(src, function(buffer) {
                that.analyze(audioContext, buffer);  // 解码完成后对buffer数据可视化处理，这里使用this会指向window
            }, function(e) {
                alert("解码失败");
                console.log(e);
            });
        };
        fileReader.readAsArrayBuffer(file);
    },
    analyze: function(audioContext, buffer) {
        var bufferSource = audioContext.createBufferSource(),
            analyser = audioContext.createAnalyser();
        analyser.fftSize = 4096;
        bufferSource.connect(analyser);  // 解码后的缓冲数据连接到analyser
        analyser.connect(audioContext.destination);  // 再将analyser连接到扬声器
        bufferSource.buffer = buffer;
        if(this.animation !== null) {
            cancelAnimationFrame(this.animation);  // 停止正在播放的
        }
        bufferSource.start();  // 开始播放
        this.playing = 1;

        this.visualise(analyser);  // 根据分析后的音频频谱信息进行绘图

        that = this;
        bufferSource.onended = function() {  // 播放结束
            that.playing = 0;
            cancelAnimationFrame(that.animation);  // 结束动画
            that.init();
        };
    },
    visualise: function(analyser) {
        switch(this.visualiseMode) {
            case "normal":
                this.visualise_normal(analyser, this.context);
                break;
            case "circle":
                this.context.translate(canvas.width/2, canvas.height/2);
                this.visualise_circle(analyser, this.context);
                break;
            case "concentric":
                this.visualise_concentric(analyser, this.context);
                break;
            case "line":
                this.visualise_line(analyser, this.context);
                break;
        }   
    },
    visualise_normal: function(analyser, context) {
        var width = 5,
            gap = 5,
            num = 0,
            step = 0,  // 采样步长
            value = 0;  // 相应频率的幅度值，物理意义为响度
        var dataArray = new Uint8Array(analyser.frequencyBinCount);  // 分析的是二进制数据，所以需要使用Uint8Array类型的数组来存储，常用长度为1024
        var that = this;
        var drawPerFrame = function() {
            analyser.getByteFrequencyData(dataArray);  // 分析频谱并将当前的频域数据返回到Uint8Array中
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = "rgba(255,255,255,0.6)";
            num = canvas.width / (width+gap);

            stepAfter = Math.round(200/num)
            stepBefore = Math.round((dataArray.length*0.8-200)/num);

            for(var i=0; i<num; i++) {
                context.save();
                var valueAfter = dataArray[i*stepAfter];
                var valueBefore = dataArray[i*stepBefore+200];
                context.fillRect(i*(width+gap), canvas.height-valueAfter*2, width, valueAfter*2);
                
                context.fillStyle = "rgb(255,255,255)";
                context.fillRect(i*(width+gap), canvas.height-valueBefore, width, valueBefore);
                context.restore();
            }

            that.animation = requestAnimationFrame(drawPerFrame);  // 递归调用以不断更新每一帧的画面
        };
        this.animation = requestAnimationFrame(drawPerFrame);
    },
    visualise_circle: function(analyser, context) {
        var frequencyArray = new Uint8Array(analyser.frequencyBinCount);
        var that = this,
            r = canvas.height/3,
            c = 2*Math.PI*r,
            length = frequencyArray.length,
            num = 100,  // 柱条数目
            ang = Math.PI / num,
            width = c / (num*2+1);

        var step = Math.round((length*0.8-200)/num);

        var waveArray = new Uint8Array(256),
            widthWave = canvas.width*1.0 /256;

        var draw = function() {
            
            analyser.getByteFrequencyData(frequencyArray);
            context.clearRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
            context.fillStyle = "rgba(255,255,255,0.6)";
            for(let i=0; i<(num*2); i++) {
                
                context.save();
                if(i<num) {
                    var value = frequencyArray[i];
                    context.rotate(ang*(i+0.5));
                    context.fillRect(-width/4, -r+value/3, width/2, width/2);  // 内环
                    context.rotate(-ang*(i+0.5)*2);  // 镜像
                    context.fillRect(-width/4, -r+value/3, width/2, width/2);
                }else {
                    var value = frequencyArray[(i-num)*step + 200];
                    context.rotate(ang*(i-num+0.5));
                    context.fillRect(-width/4, -value/2-r-5, width/2, value/2+5);  // 外环
                    context.rotate(-ang*(i-num+0.5)*2);  // 镜像
                    context.fillRect(-width/4, -value/2-r-5, width/2, value/2+5);
                }
                context.restore();
            }
            that.animation = requestAnimationFrame(draw);
        };
        this.animation = requestAnimationFrame(draw);
    },
    visualise_concentric: function(analyser, context) {
        var dataArray = new Uint8Array(analyser.frequencyBinCount);
        var num = dataArray.length,
            value = 0;
        var draw = function() {
            analyser.getByteFrequencyData(dataArray);
            context.clearRect(0, 0, canvas.width, canvas.height);
            for(var i=0; i<num; i++) {
                value = dataArray[i];
                context.beginPath();
                context.arc(300,300,value,0,360,false);
                context.lineWidth = 5;
                context.strokeStyle = "rgba("+value+","+value+",0,0.2)";
                context.stroke();  // 画空心圆
                context.closePath();
            }
            requestAnimationFrame(draw);
        };
        this.animation = requestAnimationFrame(draw);
    },
    visualise_line: function(analyser, context) {
        var dataArray = new Uint8Array(512);
        var num = dataArray.length,
            width = canvas.width*1.0 / num,
            y = 0;
        var draw = function() {
            analyser.getByteTimeDomainData(dataArray);
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.lineWidth = 2;
            context.strokeStyle = "rgb(255,0,0)";
            context.beginPath();
            var x = 0;
            for(var i=0; i<num; i++) {
                y = dataArray[i];
                if(i===0) {
                    context.moveTo(x,y-128);
                }else {
                    context.lineTo(x,y-128);
                }
                x += width;
            }
            context.stroke();
            requestAnimationFrame(draw);
        };
        this.animation = requestAnimationFrame(draw);
    },
    controller: function() {
        var ul = document.querySelector("ul"),
            mode = document.querySelectorAll('input[type="button"]');
        var that = this;
        ul.addEventListener('click', function(e) {
            var target = e.target;
            switch(target.id) {
                case "normal":
                    that.visualiseMode = "normal";
                    break;
                case "circle":
                    that.visualiseMode = "circle";
                    break;
                case "concentric":
                    that.visualiseMode = "concentric";
                    break;

            }
        }, false);
    }


};






