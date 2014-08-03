var logger = {
		
};


!function($){
	var times = {};
	
	logger.startTimeRecord = function(id){
		var curr = new Date();
		times[id] = curr;
		//logger.info(id +">>start:"+ getHHmmssSSS(curr));
	}
	
	logger.stopTimeRecord = function(id){
		var curr = new Date();
		var stime = times[id];
		//logger.info(id +">>end:"+ getHHmmssSSS(curr));
		
		var costStr = "";
		var cost = curr - stime;
		var ss = cost/1000;
		costStr = cost+"毫秒";
		if(ss>=1){
			var s = parseInt(ss); //秒
			var SSS = cost -  s*1000; //毫秒
			costStr = s+"秒"+SSS+"毫秒";
			var mm = s/60;
			if(mm>1){
				var m = parseInt(mm); //分
				s =  s - m*60; //秒
				costStr = m +"分" + s+"秒"+SSS+"毫秒";
			}
		}
		
		logger.info(id +">>cost:"+ costStr);
	}
	
	function getHHmmssSSS(date){
		return date.getHours()+":"+date.getMinutes()+":" +date.getSeconds() +"."+date.getMilliseconds();
	}
	function print(log,obj,level){
		level = level||2;
		if(typeof(obj) == "object"){
			log.value += "[";
			for(var v in obj){
				if(typeof obj[v] == "object"){
					if(level<2){
						log.value += obj[v];
					}else{
						print(log,obj[v]);
					}
					
				}else if(typeof obj[v] != 'function' ){
					log.value += v+"="+ obj[v] +",";
				}
			}
			log.value += "],";
		}else{
			log.value+=obj+",";
		}
	}
	logger.info=function(){
		if(logger.logAppend){
			var log=logger.logAppend;
			for(var i=0; i<arguments.length; i++){
				log.value += arguments[i]+",";
				//print(log,s);
				//print(log,",");
			}
			log.value += "\n";
		}				
	};
	
	logger.clear = function(){
		if(logger.logAppend){
			logger.logAppend.value = "";
		}
	};
	
	logger.initLog=function(show){
		if(logger.logAppend) return;
		var $panel=$("<div/>")
		$panel.addClass("xf-log-panel");
		$panel.css({
			width:380,
			height:120,
			position: "fixed",
			bottom:20,
			right: 300,
			"z-index": 2000
		});
		var $log=$("<textarea/>");
		$log.addClass("xf-logger");
		$log.css({
			width:300,
			height:100
		});
		$panel.append($log);
		$("body").append($panel);
		logger.logAppend=$log[0];
		$btn=$("<button/>");
		$btn.html("clear");
		$panel.append($btn);
		if(show){
			$panel.show();
		}else{
			$panel.hide();
		}
		$btn.on("click",function(e){
			$log.val("");
		});
		$(document).on("keydown",function(e){			
			if(e.ctrlKey&&e.keyCode==123){
				if($panel.is(":hidden"))
					$panel.show();
				else
					$panel.hide();
			}
		});
	};
	$(function(){
		logger.initLog(true);
	});
}(jQuery);