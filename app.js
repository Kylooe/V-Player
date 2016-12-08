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
    player.init();
    player.setFile();
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
    this.visualiseMode = "circle"
};

Player.prototype = {
    init: function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        bg.height = window.innerHeight;

        switch(this.visualiseMode) {
            case "normal":
                break;
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
        var width = 10,
            gap = 5,
            num = 0,
            step = 0,  // 采样步长
            value = 0;  // 相应频率的幅度值，物理意义为响度
        var dataArray = new Uint8Array(analyser.frequencyBinCount);  // 分析的是二进制数据，所以需要使用Uint8Array类型的数组来存储，常用长度为1024
        var that = this;
        var drawPerFrame = function() {
            analyser.getByteFrequencyData(dataArray);  // 分析频谱并将当前的频域数据返回到Uint8Array中
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = "#0000ff";
            num = canvas.width / (width+gap);
            step = Math.round(dataArray.length/num);
            for(var i=0; i<num; i++) {
                value = dataArray[i*step];
                context.fillRect(i*(width+gap)+gap, canvas.height-value, width, value);
            }
            that.animation = requestAnimationFrame(drawPerFrame);  // 递归调用以不断更新每一帧的画面
            //console.log(dataArray[875]);
            //console.log(analyser.maxDecibels);
            //console.log(analyser.minDecibels);
        };
        this.animation = requestAnimationFrame(drawPerFrame);
    },
    visualise_circle: function(analyser, context) {
        var frequencyArray = new Uint8Array(analyser.frequencyBinCount);
        var that = this,
            r = canvas.height/3,
            c = 2*Math.PI*r,
            width = 3,
            num = Math.round(c/width /2),
            step = Math.round(frequencyArray.length/num *2),
            width = c / num;
            ang = 2*Math.PI / num;
        var waveArray = new Uint8Array(256),
            widthWave = canvas.width*1.0 /256;
        var draw = function() {
            analyser.getByteFrequencyData(frequencyArray);
            context.clearRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
            context.fillStyle = "#0000ff";

            for(let i=0; i<num; i++) {
                var value = frequencyArray[i*step];
                context.save();
                context.rotate(ang*i*2);
                context.fillRect(0, -value/2-r-5, width, value/2+5);
                context.restore();
            }
            context.globalCompositeOperation = "destination-over";
            analyser.getByteTimeDomainData(waveArray);
            context.lineWidth = 2;
            context.strokeStyle = "rgb(255,0,0)";
            context.beginPath();
            for(let i=0; i<256; i++) {
                var y = waveArray[i];
                if(i===0) {
                    context.moveTo(widthWave*i - canvas.width/2, y-128);
                }else {
                    context.lineTo(widthWave*i - canvas.width/2, y-128);
                }
            }
            context.stroke();
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
                    context.moveTo(x,y);
                }else {
                    context.lineTo(x,y);
                }
                x += width;
            }
            context.stroke();
            requestAnimationFrame(draw);
        };
        this.animation = requestAnimationFrame(draw);
    },
    controller: function() {

    }


};






