var canvas = document.getElementById("canvas"),
    context = canvas.getContext("2d"),
    bg = document.getElementById("bg");

window.onload = function() {
    var player = new Player();
    player.prepareAPI();
    player.setFile();
    player.controller();
    window.addEventListener("resize", function() {
        context.restore();
        player.init();
    }, false);
};

var Player = function() {
    //this.context = canvas.getContext("2d"),
    this.audioContext = null,
    this.audio = null,
    this.list = [],
    this.title = "",
    this.playing = 0,
    this.time = null,
    this.animation = null,
    this.visualiseMode = "ring"
};

Player.prototype = {
    prepareAPI: function() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
        window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame;
        try {
            this.audioContext = new AudioContext();
            this.init();
        } catch(err) {
            alert("你的浏览器不支持Web Audio API");
            console.log(err);
        }
        console.log(this.audioContext.sampleRate);
    },
    init: function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        bg.height = window.innerHeight;
        
        context.save();
        this.visualiseMode==="normal" ? context.translate(0,0) : context.translate(canvas.width/2, canvas.height/2);
    },
    setFile: function() {
        var music = document.getElementById("music"),
            image = document.getElementById("image"),
            that = this;
        music.addEventListener("change", function() {
            if(music.files.length !== 0) {
                var file = music.files[0],
                    name = file.name.replace(/\.(?:mp3|ogg|mp4|wav)$/i, "");
                //    that.add(file, name);
                if(that.playing===0) {
                    that.title = name;
                    that.loadAudio(file); 
                }
            }
        }, false);

        image.addEventListener("change", function() {
            var file = image.files[0],
                fr = new FileReader();
            window.innerHeight<window.innerWidth ? bg.width = window.innerWidth : bg.height = window.innerHeight;
            fr.onload = function() {
                bg.src = fr.result;
            };
            if(file) {
                fr.readAsDataURL(file);
            }
        }, false);
    },
    add: function(file, name) {
        var playList = document.getElementById("play-list");
        this.list.push(file);
        playList.innerHTML += "<li>" + name + "</li>";
    },
    loadAudio: function(file) {
        var fileReader = new FileReader();
        this.audio = new Audio();
        var that = this;
        fileReader.onload = function(e) {
            var audioContext = that.audioContext;
            that.audio.src = URL.createObjectURL(file);
            that.analyze(audioContext, that.audio);
        }
        fileReader.readAsArrayBuffer(file);
        /*
        var fileReader = new FileReader();
        var that = this;  // 这里将当前的this也就是Player对象赋值给that，以防下面函数中的this指代的对象改变
        fileReader.onload = function(e) {
            var src = e.target.result,
                audioContext = that.audioContext;  // 如果这里用this则指向fileReader
            audioContext.decodeAudioData(src).then(function(buffer) {
                that.analyze(audioContext, buffer);  // 解码完成后对buffer数据可视化处理，这里使用this会指向window
            });
        };
        fileReader.readAsArrayBuffer(file);
        */
    },
    analyze: function(audioContext, audio) {
        var audioSource = audioContext.createMediaElementSource(audio),
            analyser = audioContext.createAnalyser();
        analyser.fftSize = 4096;
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);
        audio.play();
        this.playing = 1;
        this.updateTime(audio);
        this.visualise(analyser);
        var that = this;
        audio.onended = function() {
            that.playing = 0;
            clearInterval(that.time);
            cancelAnimationFrame(that.animation);
            that.init();
        };

        /*
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

        var that = this;
        bufferSource.onended = function() {  // 播放结束
            that.playing = 0;
            cancelAnimationFrame(that.animation);  // 结束动画
            that.init();
        };
        */
    },
    visualise: function(analyser) {
        var dataArray = new Uint8Array(analyser.frequencyBinCount),  // 分析的是二进制数据，所以需要使用Uint8Array类型的数组来存储，常用长度为1024
            that = this;
        
        var render = function() {
        //    var num ...
            switch(that.visualiseMode) {
                case "normal":
                    that.visualise_normal(analyser, dataArray);
                    break;
                case "circle":
                    that.visualise_circle(analyser, dataArray);
                    break;
                case "concentric":
                    that.visualise_concentric(analyser, dataArray);
                    break;
                case "line":
                    that.visualise_line(analyser);
                    break;
                case "ring":
                    that.visualise_ring(analyser, dataArray);
                    break;
            }
            that.animation = requestAnimationFrame(render);
        }
        this.animation = requestAnimationFrame(render);

    },
    visualise_normal: function(analyser, dataArray) {
        var width = 5,
            gap = 5,
            num = canvas.width / (width+gap);

        analyser.getByteFrequencyData(dataArray);  // 分析频谱并将当前的频域数据返回到Uint8Array中
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "rgba(255,255,255,0.6)";
        

        stepAfter = Math.round(200/num);  // 采样步长
        stepBefore = Math.round((dataArray.length*0.8-200)/num);

        for(var i=0; i<num; i++) {
            context.save();
            var valueAfter = dataArray[i*stepAfter];  // 相应频率的幅度值，物理意义为响度
            var valueBefore = dataArray[i*stepBefore+200];
            context.fillRect(i*(width+gap), canvas.height-valueAfter*2, width, valueAfter*2);
            
            context.fillStyle = "rgb(255,255,255)";
            context.fillRect(i*(width+gap), canvas.height-valueBefore, width, valueBefore);
            context.restore();
        }
    },
    visualise_circle: function(analyser, dataArray) {
        var r = canvas.height/3,
            c = 2*Math.PI*r,
            num = 100,  // 柱条数目
            ang = Math.PI / num,
            width = c / (num*2+1);
        var step = Math.round((dataArray.length*0.8-200)/num);

        analyser.getByteFrequencyData(dataArray);
        context.clearRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);

        context.fillStyle = "rgba(255,255,255,0.6)";
        for(let i=0; i<(num*2); i++) {
            context.save();
            if(i<num) {
                var value = dataArray[i];
                context.rotate(ang*(i+0.5));
                context.fillRect(-width/4, -r+value/3, width/2, width/2);  // 内环
                context.rotate(-ang*(i+0.5)*2);  // 镜像
                context.fillRect(-width/4, -r+value/3, width/2, width/2);
            }else {
                var value = dataArray[(i-num)*step + 200];
                context.rotate(ang*(i-num+0.5));
                context.fillRect(-width/4, -value/2-r, width/2, value/2+5);  // 外环
                context.rotate(-ang*(i-num+0.5)*2);  // 镜像
                context.fillRect(-width/4, -value/2-r, width/2, value/2+5);
            }
            context.restore();
        }

    },
    visualise_concentric: function(analyser, dataArray) {
        var num = dataArray.length;
        analyser.getByteFrequencyData(dataArray);
        context.clearRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
        for(var i=0; i<num; i++) {
            var value = dataArray[i*20];
            context.beginPath();
            context.arc(0, 0, value, 0, 360, false);
            context.lineWidth = 3;
            context.strokeStyle = "rgba(" + value + ", " + value + ", " + value + ", 0.2)";
            context.stroke();  // 画空心圆
            context.closePath();
        }
    },
    visualise_line: function(analyser, dataArray) {
        var width = canvas.width*1.0 / 512,
            y = 0;

            analyser.getByteTimeDomainData(dataArray);
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.lineWidth = 2;
            context.strokeStyle = "rgb(255,0,0)";
            context.beginPath();
            var x = 0;
            for(var i=0; i<512; i++) {
                y = dataArray[i];
                if(i===0) {
                    context.moveTo(x,y-128);
                }else {
                    context.lineTo(x,y-128);
                }
                x += width;
            }
            context.stroke();
    },
 /*   visualise_double: function(analyser, dataArray) {
        analyser.getByteFrequencyData(dataArray);
        context.clearRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
        context.fillStyle = "rgba(255,255,255,0.6)";

        var rOuter = canvas.height/3,
            lOuter = 2*Math.PI*rOuter * 0.8,
            angOuter = 2*Math.PI * 0.8 / 100,
            widthOuter = lOuter / 100,

            rInner = canvas.height/4,
            lInner = 2*Math.PI*rInner * 0.8,
            //angInner = 2*Math.PI * 0.8 / 200,
            widthInner = lInner / (200*2-1),
            step = Math.round((dataArray.length*0.8-200)/200);
        for(let i=0; i<200; i++) {
            context.save();
            if(i<100) {
                context.rotate(angOuter*i + 0.1*2*Math.PI);
                var valueOuter = dataArray[i];
                context.fillRect(0, -rOuter-valueOuter/2-5, widthOuter/2, valueOuter/2+5);
                context.fillStyle = "rgb(255,255,255)";
                context.rotate(-angOuter/2 *i);
                var valueInner = dataArray[i*step +200];
                context.fillRect(0, -rInner-valueInner-2, widthInner/2, valueInner+2);
            }else {
                context.fillStyle = "rgb(255,255,255)";
                context.rotate(angOuter/2 *i + 0.2*Math.PI);
                var valueInner = dataArray[i*step +200];
                context.fillRect(0, -rInner-valueInner-2, widthInner/2, valueInner+2);  // 内环
            }
            context.restore();
        }

    }, */
    visualise_ring: function(analyser, dataArray) {
        analyser.getByteFrequencyData(dataArray);
        context.clearRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
        context.fillStyle = "rgba(255,255,255,0.6)";

        var r = canvas.height/3,
            cOut = 2 * Math.PI * r,
            cIn = 2 * Math.PI * (r-100),
            num = 200,
            ang = 2 * Math.PI / num,
            step = Math.round((dataArray.length*0.8 -100) /num),
            widthOut = cOut / num,
            widthIn = cIn / num;

        for(let i=0; i<num; i++) {
            context.save();
            var value = dataArray[i*step +100];
            context.rotate(ang*i);
            context.fillRect(0, -r-5, widthOut/2, value/255*100+5);
            context.fillStyle = "rgb(255,255,255)";
            context.fillRect(0, -r+100 - value/255*100-2, widthIn/2, value/255*100+2);
            context.restore();
        }
    },

    controller: function() {
        var pause = document.getElementsByTagName("button")[0];
        var that = this;
        pause.onclick = function() {
            if(that.audio.paused) {
                that.audio.play();
                that.updateTime(that.audio);
            }else {
                that.audio.pause();
                clearInterval(that.time);
            }
        }

        var ul = document.getElementById("effect");
        var that = this;
        ul.addEventListener('click', function(e) {
            var target = e.target;
            context.restore();
            context.save();
            switch(target.id) {
                case "normal":
                    context.translate(0,0);
                    that.visualiseMode = "normal";
                    break;
                case "circle":
                    context.translate(canvas.width/2, canvas.height/2);
                    that.visualiseMode = "circle";
                    break;
                case "concentric":
                    context.translate(canvas.width/2, canvas.height/2);
                    that.visualiseMode = "concentric";
                    break;
                case "ring":
                    context.translate(canvas.width/2, canvas.height/2);
                    that.visualiseMode = "ring";
                    break;
            }
        }, false);
    },

    updateTime: function(audio) {
        var dom = document.getElementsByTagName("p")[0];
        function add0(num) {
            return num<10 ? "0"+num : num;
        }
        function format(num) {
            var m = parseInt(num/60),
                s = parseInt(num - m*60);
            return add0(m) + ":" + add0(s);
        }
        this.time = setInterval(function() {
            dom.innerHTML = format(audio.currentTime) + "/" + format(audio.duration);
        }, 100);
    }


};






