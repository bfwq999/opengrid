(function($,window,undefined){
		
	var _rowid = 0; //行标识
	
	var getId = (function(){
		var i = 0;
		return function(){
			return i++;
		}
	})();
	
	
	var _RESIZE_HOT_WIDTH = 10; //缩放热点范围，在这个范围内将鼠指针变成可缩放的
	
	var DIR_E = 'e', //方向-东
		DIR_W = 'w', //方向-西
		DIR_S = 's', //方向-南
		DIR_N = 'n'; //方向-北
		DIR_C = 'c'; //方向-中
	
	var isPercent = function(str){
		if(str && typeof(str) == 'string'){
			return str.charAt(str.length-1)=='%';
		}
		return false;
	};
	
	 String.prototype.trim=function(){
	    return this.replace(/(^\s*)|(\s*$)/g, "");
	 }
	
	/**
	 * 解析百分数，如果不是百分数，则返回空
	 */
	function parsePercent(source) {      
		if(!source || typeof(source) != 'string' ){
			return null;
		}
		var p = source.charAt(source.length-1);
		if(p != '%'){
			return null;
		}
		var s = source.substring(0,source.length-1);
		try{
			return parseFloat(s)/100;
		}catch(e){
			return null;
		}
	}
	
	function parserOrderBy(orderBy){
		var orders = orderBy.split(",");
		var sortNames = [];
		var sortOrders = [];
		for ( var i = 0; i < orders.length; i++) {
			if(!orders[i]){
				continue;
			}
			var t = orders[i].trim().split(" ");
			sortNames.push(t[0].trim());
			sortOrders.push(t[1]?t[1].trim():'asc');
		}
		return {
			sortNames:sortNames,
			sortOrders:sortOrders
		}
	}
	/**
	 * 取元素在数组中的索引
	 */
	function arrayIndexOf(array, el, key) {
		if(key){
			for ( var i = 0, len = array.length; i < len; i++) {
				if (array[i][key] == el[key]) {
					return i;
				}
			}
		}else{
			for ( var i = 0, len = array.length; i < len; i++) {
				if (array[i] == el) {
					return i;
				}
			}
		}
		return -1;
	};
	
	/**
	 * 移除数组中的元素
	 * @param array
	 * @param key 根据key属性来移除
	 * @param id
	 */
	function arrayRemove(array, key, id) {
		if (typeof key == "string") {
			for ( var i = 0, len = array.length; i < len; i++) {
				if (array[i][key] == id) {
					array.splice(i, 1);
					return;
				}
			}
		} else {
			var pos = arrayIndexOf(array, key);
			if (pos != -1) {
				array.splice(pos, 1);
			}
		}
	};
	
	/**
	 * 添加值到数组中，如果存在此值则覆盖
	 * @param array
	 * @param id
	 * @param row
	 */
	function arrayAdd(array, id, row) {
		for ( var i = 0, len = array.length; i < len; i++) {
			if (array[i][id] == row[id]) {
				array[i] = row;
				return;
			}
		}
		array.push(row);
	}
	
	/**
	 * 获取鼠标在单元格上的方向
	 * @param x,y 坐标点
	 * @param $cell 单元格jquery对象
	 */
	function getDirection($cell,x,y){
		var p1 = $cell.offset().left + _RESIZE_HOT_WIDTH;
		var p2 = $cell.offset().left + $cell.outerWidth() - _RESIZE_HOT_WIDTH;
		if(x < p1){
			return DIR_W; //西方
		}
		if(x > p2){
			return DIR_E; //东方
		}
		return DIR_C; //中间
	};
	
	var OpenGrid = function($container,options){
		logger.startTimeRecord("init");
		var self = this;
		this.$container = $container;
		this.options = $.extend(true,{},$.fn.opengrid.defaults,options);
		this.selectedRows = [];
		this.checkedRows = [];
		this.data = [];
		this.originalRows = [];
		this.updatedRows = [];
		this.insertedRows = [];
		this.deletedRows = [];
		
		this.options.bodyManager = $.extend({},bodyManager,this.options.bodyManager);
		
		// 解析columns,给列属性添加parent,childre等属性
		if(!this.options.columns){
			this.options.columns = [];
		}
		for ( var i = 0; i < this.options.columns.length; i++) {
			for ( var j = 0; j < this.options.columns[i].length; j++) {
				this.options.columns[i][j] = $.extend({},this.options.columnOptions,this.options.columns[i][j]);
			}
		}
		parseColumns(this.options.columns);
		if(!this.options.frozenColumns){
			this.options.frozenColumns = [];
		}
		for ( var i = 0; i < this.options.frozenColumns.length; i++) {
			for ( var j = 0; j < this.options.frozenColumns[i].length; j++) {
				this.options.frozenColumns[i][j] = $.extend({},$.fn.opengrid.defaults.columnOptions,this.options.frozenColumns[i][j]);
			}
		}
		parseColumns(this.options.frozenColumns);
		/**
		 * 解析columns的上下级关系
		 */
		function parseColumns(columns){
			if(columns.length>0){
				var rowIndex = 0;
				var rowCols0 = columns[rowIndex];
				//取第一行
				var actColIndex = 0; //当前列所有的实例列位置
				
				for ( var i = 0; i < rowCols0.length; i++) {
					var col = rowCols0[i];
					col.children = [];
					col.vcCount = 0;  // visible child count
					col._colIndex_s = actColIndex; //列开始位置
					actColIndex += (col.colspan||1); //下列的开始位置
					col._collIndex_e = actColIndex-1; //列结束位置,即从当前列框中_colIndex_s到_collIndex_e列
					col._rowIndex = 0;
				}
				
				
				for ( var rowIndex = 1; rowIndex < columns.length; rowIndex++) {//循环第一行
					actColIndex = 0; // 当前列实际位置
					var rowCols1 = columns[rowIndex];
					var pCol = null; // 父列
					
					for ( var i = 0; i < rowCols1.length; i++) {
						// 设置上一层属性，将children添加进去
						var col = rowCols1[i];
						col.children = [];
						col.vcCount = 0;  // visible child count
						
						if(!pCol || actColIndex < pCol._colIndex_s ||  actColIndex>pCol._collIndex_e){
							//不与上一列共父亲,得从第一层循环,找到祖宗列,然后递归找其最后一个孙子,就是当前列的父亲
							var children = rowCols0;
							//找到祖宗列后,递归找到最后一个孙子
							var z = 100;
							while(z--){
								if(children && children.length>0){
									pCol = null; //先置空，得判断下一个循环是否能找到pCol,如果找不到则说明数据有问题
									for(var q=0; q<children.length; q++){
										//开始找它的祖宗列
										var pcol = children[q];
										if(pcol._colIndex_s<actColIndex){
											continue;
										}
										if(pcol._colIndex_s>= actColIndex && actColIndex<=pcol._collIndex_e){
											if(pcol._rowIndex + pcol.rowspan>rowIndex){
												//如果列占竖跨当前行,当前列的实际序号加1,继续找
												actColIndex++;
												continue;
											}else{
												pCol = pcol;
												children = pCol.children;
												break;
											}
										}
										if(actColIndex>pcol._collIndex_e){
											//此时还找不到，则没必要再循环了
											break;
										}
									}
								}else{
									break;
								}
							}
							
							if(!pCol){
								//如果找不到祖宗列,参数有问题
								break;
							}
						}
						
						col._colIndex_s = actColIndex;
						actColIndex += (col.colspan||1);
						col._collIndex_e = actColIndex-1;
						col._rowIndex = rowIndex; 
						
						col.parent = pCol;
						pCol.children.push(col);
						if(!col.hidden){
							pCol.vcCount++;
						}
					}
				}
			}
		};
		// 整理colspan值
		if(this.options.columns.length>0){
			setColspan(this.options.columns[0]); // 从第一行递归解析
		}
		if(this.options.frozenColumns.length>0){
			setColspan(this.options.frozenColumns[0]);// 从第一行递归解析
		}
		
		/**
		 * 设置colspan值
		 */
		function setColspan(cols){
			var colspan = 0;
			for ( var j = 0; j < cols.length; j++) {
				var col = cols[j];
				if(col.children && col.children.length>0){
					if(col.hidden){
						// 子对象都变成hidden
						for ( var k = 0; k < col.children.length; k++) {
							col.children[k].hidden = true;
						}
					}
					col.colspan = setColspan(col.children);
					if(col.colspan == 0){
						col.hidden = true;
					}
					
				}
				if(!col.hidden){
					colspan += (col.colspan||1);
				}
			}
			return colspan;
		};
		
		
		
		
		this.options.leafColumns = this.getLeafColumns(false);
		this.options.leafFrozenColumns = this.getLeafColumns(true);
		
		this.options.allLeafColumns = this.options.leafFrozenColumns.concat(this.options.leafColumns);
		/**
		 * 宽度计算只对field有值且可见的列生效
		 */
		var percentWidthColumns = this.options.percentWidthColumns = []; // 宽度为百分比的列
		var autoWidthColumns = this.options.autoWidthColumns = []; // 宽度为“auto”的列
		var noWidthColumns = [];
		var percentSum = 0;
		
		/**
		 * 归类列
		 */
		function categorizeColumns(columns){
			var p;
			for ( var i = 0; i < columns.length; i++) {
				var col = columns[i];
				if(!col.width){// 没有设置宽度的列
					noWidthColumns.push(col);
				}else if(col.width == 'auto'){// 宽度为'auto'的列
					autoWidthColumns.push(col);
					col.isAutoWidth = true;
					col.nowrap = true;
				}else if(p = parsePercent(col.width)){// 宽度为百分比的列
					col.width = p;
					col.isPercentWidth = true;
					percentWidthColumns.push(col);
					percentSum += p;
				}else{
					col.width = parseInt(col.width,10);
				}
				if(!col.nowrap){
					self.options.autoRowHeight = true; //存在列内容换行的,行高度根据内容自动调整
				}
				if(col.type){
					var pos;
					if(col.type == 'rownumber'){
						self.options.rownumbers = true;
						col._rownumber = true;
						col.nowrap = true;
					}else if( (pos = col.type.indexOf("_rownumber")) > -1){
						//分组分组字段序号
						col._group = true;
						col._rownumber = true;
						col._gfield = col.type.substring(0,pos);
						col.nowrap = true;
					}else if( (pos = col.type.indexOf("_grownumber")) > -1){
						//分组后小组行序号
						col._grownumber = true;
						col._gfield = col.type.substring(0,pos);
						col.nowrap = true;
					}
				}else if( self.options.groupBy && self.options.groupBy.indexOf(col.field)>-1 ){
					col._group = true;
				}
			}
		}
		
		categorizeColumns(this.options.allLeafColumns); //归类
		
		if(noWidthColumns.length>0){
			if(percentSum>=1){
				// 没有给noWidth列留空间时,列最小宽度生效
				for ( var i = 0; i < noWidthColumns.length; i++) {
					noWidthColumns[i].width = noWidthColumns[i].minWidth;
				}
			}else{
				var pp = (1-percentSum)/noWidthColumns.length;
				for ( var i = 0; i < noWidthColumns.length; i++) {
					var col = noWidthColumns[i];
					percentWidthColumns.push(col);
					col.width = pp;
					col.isPercentWidth = true;
				}
			}
		}
		// 创建基本骨架
		this.renderFrame();
		// 创建头部
		this.renderHeader();
//		if(autoWidthColumns.length<1){
//			  // 没有自适应宽度的列时，在加载内容前设置宽度
//			this.resize(); // 设置宽度，高度
//		}
		
		if (this.options.data) {
			this.data = this.options.data;
			this.renderBody();
		}else{
			this.loadData(); // 加载
		}
		this.bindEvent(); //加载事件,行事件，表头宽度可缩放事件
		logger.stopTimeRecord("init");
	};
	
	var gridproto = OpenGrid.prototype;
	
	gridproto.getRowIndex = function(row) {
		if (typeof row == "object") {
			return arrayIndexOf(this.data, row);
		} else {
			for ( var i = 0; i < this.data.length; i++) {
				if (this.data[i][this.options.idField] == row) {
					return i;
				}
			}
			return -1;
		}
	};
	
	
	gridproto.mergeCells = function(param) {
		var opts = this.options;
		param.rowspan = param.rowspan || 1;
		param.colspan = param.colspan || 1;
		if (param.rowspan == 1 && param.colspan == 1) {
			return;
		}
		var tr = opts.bodyManager.getTr(this, (param.index == null ? param.id : param.index));
		if (!tr.length) {
			return;
		}
		var row = opts.bodyManager.getRow(this, tr);
		var fieldVal = row[param.field];
		var td = tr.find("td[field=\"" + param.field + "\"]");
		td.attr("rowspan", param.rowspan).attr("colspan", param.colspan);
		td.addClass("opengrid-td-merged");
		for ( var i = 1; i < param.colspan; i++) {
			td = td.next();
			td.hide();
			row[td.attr("field")] = fieldVal;
		}
		for ( var i = 1; i < param.rowspan; i++) {
			tr = tr.next();
			if (!tr.length) {
				break;
			}
			var row = opts.bodyManager.getRow(this, tr);
			var td = tr.find("td[field=\"" + param.field + "\"]").hide();
			row[td.attr("field")] = fieldVal;
			for ( var j = 1; j < param.colspan; j++) {
				td = td.next();
				td.hide();
				row[td.attr("field")] = fieldVal;
			}
		}
		this.fixMergeColumnSize();
	};
	
	/**
	 * 开始编辑
	 */
	gridproto.beginEdit =  function(rowIndex) {
		logger.startTimeRecord("beginEdit");
		var opts = this.options;
		var tr = opts.bodyManager.getTr(this, rowIndex);
		var row = opts.bodyManager.getRow(this, rowIndex);
		if (tr.hasClass("opengrid-row-editing")) {
			return;
		}
		if (opts.onBeforeEdit.call(this, rowIndex, row) == false) {
			return;
		}
		tr.addClass("opengrid-row-editing");
		this.editingRow(rowIndex);
		this.setEditorColSize();
		tr.find("div.opengrid-editable").each(function() {
			var field = $(this).parent().attr("field");
			var ed = $.data(this, "opengrid.editor");
			ed.actions.setValue(ed.target, row[field]);
		});
		logger.stopTimeRecord("beginEdit");
	};
	
	/**
	 * 编辑行
	 */
	gridproto.editingRow =  function(rowIndex) {
		var self = this;
		var opts = this.options;
		var tr = opts.bodyManager.getTr(this, rowIndex);
		tr.children("td").each(function() {
			var cell = $(this).find("div.opengrid-cell");
			var colField = $(this).attr("field");
			var col = self.getColumnOptionByField(colField);
			if (col && col.editor) {
				var colEditor, colEditorOpts;
				if (typeof col.editor == "string") {
					colEditor = col.editor;
				} else {
					colEditor = col.editor.type;
					colEditorOpts = col.editor.options;
				}
				var editor = opts.editors[colEditor];
				if (editor) {
					var cellHtml = cell.html();
					//var cellWidth = col.$td.width();
					cell.addClass("opengrid-editable");
					//cell.outerWidth(cellWidth);
					cell.html("<table border=\"0\" cellspacing=\"0\" cellpadding=\"1\"><tr><td></td></tr></table>");
					cell.children("table").bind("click dblclick contextmenu",
							function(e) {
								e.stopPropagation();
					});
					$.data(cell[0], "opengrid.editor", {
						actions : editor,
						target : editor.init(cell.find("td"),colEditorOpts),
						field : colField,
						type : colEditor,
						oldHtml : cellHtml
					});
				}
			}
		});
		this.fixRowHeight(rowIndex, true);
	};
	
	
	gridproto.endEdit = function(rowIndex, cancel) {
		logger.startTimeRecord("endEdit");
		var opts = this.options;
		var updatedRows = this.updatedRows;
		var insertedRows = this.insertedRows;
		var tr = opts.bodyManager.getTr(this, rowIndex);
		var row = opts.bodyManager.getRow(this, rowIndex);
		if (!tr.hasClass("opengrid-row-editing")) {
			return;
		}
		if (!cancel) {
			//TODO 添加输入框校验
			var isUpdate = false;
			var rowData = {};
			tr.find("div.opengrid-editable").each(function() {
				var field = $(this).parent().attr("field");
				var ed = $.data(this, "opengrid.editor");
				var val = ed.actions.getValue(ed.target);
				if (row[field] != val) {
					row[field] = val;
					isUpdate = true;
					rowData[field] = val;
				}
			});
			if (isUpdate) {
				if (arrayIndexOf(insertedRows, row) == -1) {
					if (arrayIndexOf(updatedRows, row) == -1) {
						updatedRows.push(row);
					}
				}
			}
		}
		tr.removeClass("opengrid-row-editing");
		this.updateRowData(rowIndex);
		opts.bodyManager.refreshRow(this,rowIndex);
		if (!cancel) {
			opts.onAfterEdit.call(this, rowIndex, row, rowData);
		} else {
			opts.onCancelEdit.call(this, rowIndex, row);
		}
		
		logger.stopTimeRecord("endEdit");
	};
	
	
	gridproto.updateRowData = function(rowIndex) {
		var opts = this.options;
		var tr = opts.bodyManager.getTr(this,rowIndex);
		tr.children("td").each(function() {
			var cell = $(this).find("div.opengrid-editable");
			if (cell.length) {
				var ed = $.data(cell[0], "opengrid.editor");
				if (ed.actions.destroy) {
					ed.actions.destroy(ed.target);
				}
				cell.html(ed.oldHtml);
				$.removeData(cell[0], "opengrid.editor");
				cell.removeClass("opengrid-editable");
				cell.css("width", "");
			}
		});
	};
	
	
	gridproto.getChanges =  function(type) {
		switch(type){
			case 'inserted':
				return this.insertedRows;
			case 'updated':
				return this.updatedRows;
			case 'deleted':
				return this.deletedRows;
			default:
				return [].concat(this.insertedRows).concat(this.updatedRows).concat(this.deletedRows);
		}
	}
	/**
	 * 根据列名获取列属性
	 * @param field
	 * @returns
	 */
	gridproto.getColumnOptionByField = function(field) {
		var allLeafCols = this.options.allLeafColumns;
		for ( var i = 0; i < allLeafCols.length; i++) {
			if(allLeafCols[i].field ==  field){
				return allLeafCols[i];
			}
		}
	};
	
	/**
	 * 得到列的前一列
	 */
	gridproto.getPreColumn =  function(field){
		var leafcols = this.options.allLeafColumns;
		for ( var i = 1; i < leafcols.length; i++) {
			if(leafcols[i].field == field){
				return leafcols[i-1];
			}
		}
	};
	
	gridproto.scrollTo = function(rowIndex) {
		var dc = this.dc;
		var opts = this.options;
		var tr = opts.bodyManager.getTr(this, rowIndex);
		if (tr.length) {
			if (tr.closest("table").hasClass("opengrid-btable-frozen")) {
				return;
			}
			var header2Height = dc.header2.parent().outerHeight();
			var body2 = dc.body2;
			var marginH = body2.outerHeight(true) - body2.outerHeight();
			var top = tr.position().top - header2Height - marginH;
			if (top < 0) {
				body2.scrollTop(body2.scrollTop() + top);
			} else {
				if (top + tr.outerHeight() > body2.height() - 18) {
					body2.scrollTop(body2.scrollTop() + top + tr.outerHeight()
							- body2.height() + 18);
				}
			}
		}
	};
		
	/**
	 * 高亮选中的行
	 */
	gridproto.highlightRow = function(rowIndex) {
		var opts = this.options;
		opts.bodyManager.getTr(this, opts.highlightIndex).removeClass("opengrid-row-over");
		opts.bodyManager.getTr(this, rowIndex).addClass("opengrid-row-over");
		opts.highlightIndex = rowIndex;
	};
	
	gridproto.checkRow = function(rowIndex, flag) {
		var opts = this.options;
		var dc = this.dc;
		
		if (!flag && opts.selectOnCheck) {
			this.selectRow(rowIndex, true);
		}
		var tr = opts.bodyManager.getTr(this, rowIndex).addClass("opengrid-row-checked");
		var ck = tr.find("div.opengrid-cell-check input[type=checkbox]");
		ck.attr("checked", "checked");
		tr = opts.bodyManager.getTr(this, "", "checked", 2);
		if (tr.length == this.data.length) {
			dc.header1.add(dc.header2).find("input[type=checkbox]").attr("checked", "checked");
		}
		var row = opts.bodyManager.getRow(this, rowIndex);
		arrayAdd(this.checkedRows, "_id", row);
		opts.onCheck.call(this, rowIndex, row);
	};
	
	gridproto.selectRow = function(rowIndex, flag) {
		var dc = this.dc;
		var opts = this.options;
		var selectedRows = this.selectedRows;
		if (opts.singleSelect) {
			this.unselectAll(this);
			selectedRows.splice(0, selectedRows.length);
		}
		if (!flag && opts.checkOnSelect) {
			this.checkRow(rowIndex, true);
		}
		var row = opts.bodyManager.getRow(this, rowIndex);
		arrayAdd(selectedRows, "_id", row);
		opts.bodyManager.getTr(this, rowIndex).addClass("opengrid-row-selected");
		opts.onSelect.call(this, rowIndex, row);
		this.scrollTo(rowIndex);
	};
	
	
	gridproto.checkAll = function(flag){
		var opts = this.options;
		var rows = this.data;
		if (!flag && opts.selectOnCheck) {
			this.selectAll(this, true);
		}
		var dc = this.dc;
		var hck = dc.header1.add(dc.header2).find("input[type=checkbox]");
		var bck = opts.bodyManager.getTr(this, "", "allbody").addClass(
				"opengrid-row-checked").find(
				"div.opengrid-cell-check input[type=checkbox]");
		hck.add(bck).attr("checked", "checked");
		for ( var i = 0; i < rows.length; i++) {
			arrayAdd(this.checkedRows, "_id", rows[i]);
		}
		opts.onCheckAll.call(this, rows);
	};
	
	gridproto.selectAll = function(flag){
		var opts = this.options;
		var rows = this.data;
		var selectedRows = this.selectedRows;
		if (!flag && opts.checkOnSelect) {
			this.uncheckRow(this, true);
		}
		opts.bodyManager.getTr(this, "", "allbody")
				.addClass("opengrid-row-selected");
		for ( var i = 0; i < rows.length; i++) {
			arrayAdd(selectedRows, '_id', rows[i]);
		}
		opts.onSelectAll.call(this, rows);
	};
	
	/**
	 * 不选择行
	 */
	gridproto.uncheckRow  = function(rowIndex, flag) {
		var opts = this.options;
		var dc = this.dc;
		if (!flag && opts.selectOnCheck) {
			this.unselectRow(rowIndex, true);
		}
		var tr = opts.bodyManager.getTr(this, rowIndex).removeClass(
				"opengrid-row-checked");
		var ck = tr.find("div.opengrid-cell-check input[type=checkbox]");
		ck.attr("checked", "checked");
		var headers = dc.header1.add(dc.header2);
		headers.find("input[type=checkbox]").removeAttr("checked");
		var row = opts.bodyManager.getRow(this, rowIndex);
		arrayRemove(opts.checkedRows, '_id', row['_id']);
		opts.onUncheck.call(this, rowIndex, row);
	};
	
	gridproto.unselectRow = function(rowIndex, flag) {
		var dc = this.dc;
		var opts = this.options;
		if (!flag && opts.checkOnSelect) {
			this.uncheckRow(rowIndex, true);
		}
		opts.bodyManager.getTr(this, rowIndex).removeClass("opengrid-row-selected");
		var row = opts.bodyManager.getRow(this, rowIndex);
		arrayRemove(this.selectedRows, '_id', row['_id']);
		opts.onUnselect.call(this, rowIndex, row);
	};
	
	gridproto.uncheckRow = function(rowIndex, flag) {
		var opts = this.options;
		var dc = this.dc;
		if (!flag && opts.selectOnCheck) {
			this.unselectRow(rowIndex, true);
		}
		var tr = opts.bodyManager.getTr(this, rowIndex).removeClass("opengrid-row-checked");
		tr.find("div.opengrid-cell-check input[type=checkbox]").removeAttr("checked");
		dc.header1.add(dc.header2).find("input[type=checkbox]").removeAttr("checked");
		var row = opts.bodyManager.getRow(this, rowIndex);
		arrayRemove(this.checkedRows,'_id', row['_id']);
		opts.onUncheck.call(this, rowIndex, row);
	};
	
	gridproto.uncheckAll = function(flag) {
		var opts = this.options;
		var rows = this.data;
		var dc = this.dc;
		
		if (!flag && opts.selectOnCheck) {
			this.unselectAll(this, true);
		}
		var hck = dc.header1.add(dc.header2).find("input[type=checkbox]");
		var bck = opts.bodyManager.getTr(this, "", "checked").removeClass(
				"opengrid-row-checked").find("div.opengrid-cell-check input[type=checkbox]");
		hck.add(bck).removeAttr("checked");
		for ( var i = 0; i < rows.length; i++) {
			arrayRemove(this.checkedRows, '_id', rows[i]['_id']);
		}
		opts.onUncheckAll.call(this, rows);
	}
	
	gridproto.unselectAll = function(flag) {
		var opts = this.options;
		var rows = this.data;
		var selectedRows = this.selectedRows;
		if (!flag && opts.checkOnSelect) {
			this.uncheckAll(this, true);
		}
		opts.bodyManager.getTr(this, "", "selected").removeClass("opengrid-row-selected");
		for ( var i = 0; i < rows.length; i++) {
			arrayRemove(selectedRows, '_id', rows[i]['_id']);
		}
		opts.onUnselectAll.call(this, rows);
	};
	
	/**
	 * 获取选中项
	 */
	gridproto.getSelections = function() {
		var opts = this.options;
		return this.selectedRows;
		
		/*if (opts.idField) {
			return this.selectedRows;
		} else {
			var selectedRows = [];
			this.options.bodyManager.getTr(this, "", "selected", 2).each(function() {
				var _dd = parseInt($(this).attr("opengrid-row-index"));
				selectedRows.push(this.data[_dd]);
			});
			return selectedRows;
		}*/
	};
	
	gridproto.showAllSubGrid = function(){
		var self = this;
		var opts = this.options;
		var $cells = this.dc.body1.add(this.dc.body2).find("div.opengrid-cell-rowlink").each(function(){
			var tr = $(this).closest("tr.opengrid-row");
			var rowIndex = opts.bodyManager.getRowIndex(tr);
			self.showSubGrid(rowIndex);
		});
		this.dc.header1.add(this.dc.header2).find("div.opengrid-header-rowlink").addClass("opengrid-rowlink-expanded");
	};
	
	gridproto.hideAllSubGrid = function(){
		var self = this;
		var opts = this.options;
		var $cells = this.dc.body1.add(this.dc.body2).find("div.opengrid-cell-rowlink").each(function(){
			var tr = $(this).closest("tr.opengrid-row");
			var rowIndex = opts.bodyManager.getRowIndex(tr);
			self.hideSubGrid(rowIndex);
		});
		this.dc.header1.add(this.dc.header2).find("div.opengrid-header-rowlink").removeClass("opengrid-rowlink-expanded");
	};
	
	gridproto.showSubGrid = function(rowIndex){
		var opts = this.options;
		var data = this.data;
		if(!data || !data[rowIndex]){
			return;
		}
		var row = data[rowIndex];
		
		var $tr = opts.bodyManager.getTr(this, rowIndex);
		var $cell = $tr.find("div.opengrid-cell-rowlink");
		if(!row.children || row.children.length==0){
			var field = $cell.closest("td[field]").attr("field");
			this.loadChildrenData(field,rowIndex);
			$cell.addClass("opengrid-rowlink-expanded");
		}else{
			$tr.eq(0).nextAll("tr[pid='"+$tr.eq(0).attr("id")+"']").show();
			$tr.eq(1).nextAll("tr[pid='"+$tr.eq(1).attr("id")+"']").show();
			$cell.addClass("opengrid-rowlink-expanded");
		}
	};
	
	gridproto.hideSubGrid = function(rowIndex){
		var opts = this.options;
		var data = this.data[rowIndex];
		if(!data || !data.children || data.children.length==0){
			return;
		}
		var $tr = opts.bodyManager.getTr(this, rowIndex);
		var $cell = $tr.find("div.opengrid-cell-rowlink");
		$tr.eq(0).nextAll("tr[pid='"+$tr.eq(0).attr("id")+"']").hide();
		$tr.eq(1).nextAll("tr[pid='"+$tr.eq(1).attr("id")+"']").hide();
		$cell.removeClass("opengrid-rowlink-expanded");
	};
	
	
	
	/**
	 * 绑定事件 
	 */
	gridproto.bindEvent = function(){
		var self = this;
		var panel = self.panel;
		var opts = self.options;
		var dc = self.dc;
		var $headers = dc.header1.add(dc.header2);
		
		$headers.off(".opengrid")
		.on("click.opengrid","input[type=checkbox]",function(e){
			//checkbox事件
			if (opts.singleSelect && opts.selectOnCheck) {
				return false;
			}
			if ($(this).is(":checked")) {
				self.checkAll();
			} else {
				self.uncheckAll();
			}
			e.stopPropagation();
		}).on("mouseenter.opengrid","td",function(e){
			//鼠标事件
			if (self.resizing) {
				return;
			}
			$(this).addClass("opengrid-header-over");
		}).on("mouseleave.opengrid","td",function(e){
			//鼠标事件
			$(this).removeClass("opengrid-header-over");
		}).on("contextmenu.opengrid","td",function(e){
			//鼠标事件
			var field = $(this).attr("field");
			opts.onHeaderContextMenu.call(self, e, field);
		}).on("click.opengrid","div.opengrid-cell",function(e){
			if($(this).hasClass("opengrid-header-rowlink")){
				if ($(this).hasClass("opengrid-rowlink-expanded")) {
					//已经展开,关闭
					self.hideAllSubGrid();
				} else {
					self.showAllSubGrid();
				}
				e.stopPropagation();
			}else{
				//单元格点击事件
				var field = $(this).parent().attr("field");
				var col = self.getColumnOptionByField(field);
				if (!col.sortable || self.resizing){
				  return;
				}
				var dir = getDirection($(this),e.pageX);

				if(dir !=  DIR_C){
				  // 在列宽度控制区
				  return;
				}
				var obj = parserOrderBy(opts.pagination.orderBy);
				var sortNames = obj.sortNames;
				var sortOrders = obj.sortOrders;
				
				var pos = arrayIndexOf(sortNames, field);
				var colOrder = col.order || "asc";
				if (pos >= 0) {
					$(this).removeClass("opengrid-sort-asc opengrid-sort-desc");
					var colOrder1 = sortOrders[pos] == "asc" ? "desc": "asc";
					if (opts.multiSort && colOrder1 == colOrder) {
						sortNames.splice(pos, 1);
						sortOrders.splice(pos, 1);
					} else {
						sortOrders[pos] = colOrder1;
						$(this).addClass("opengrid-sort-" + colOrder1);
					}
				} else {
					if (opts.multiSort) {
						sortNames.push(field);
						sortOrders.push(colOrder);
					} else {
						sortNames = [ field ];
						sortOrders = [ colOrder ];
						$(this).removeClass("opengrid-sort-asc opengrid-sort-desc");
					}
					$(this).addClass("opengrid-sort-" + colOrder);
				}
				for(var i=0; i<sortNames.length; i++){
					sortNames[i] += " "+sortOrders[i];
				}
				opts.pagination.orderBy = sortNames.join(",");
				if (opts.remoteSort) {
					self.startLoad();
				} else {
					self.renderBody();
				}
				opts.onSortColumn.call(self, opts.sortName,opts.sortOrder);
			}
		}).on("dblclick.opengrid","div.opengrid-cell",function(e){
			//单元格双击事件,触发单元格宽度自适应
			var p1 = $(this).offset().left + _RESIZE_HOT_WIDTH;
			var p2 = $(this).offset().left + $(this).outerWidth() - _RESIZE_HOT_WIDTH;
			var dir = getDirection($(this),e.pageX);
			
			if( dir == DIR_C){
				//鼠标不在单元格的左右边界，不触发缩放
				return;
			}
			
			var field = $(this).parent().attr("field");
			var col;
			if(dir == DIR_W){
				//鼠标在单元格的左边界，缩放它的前一个单元格
				col = self.getPreColumn(field);
			}else{
				col = self.getColumnOptionByField(field);
			}
			
			if(!col || col.resizable == false){
				//获取不到列
					return;
				}
			self.autoSizeColumn(col.field);
		}).off(".resizable")
		.on("mousemove.resizable","div.opengrid-cell",function(e){
			var dir = getDirection($(this),e.pageX);
			if (dir == DIR_C) {
				$(this).css('cursor', 'default');
			} else {
				var col;
				var field = $(this).parent().attr("field");
				if(dir == DIR_W){
					//鼠标在单元格的左边界，缩放它的前一个单元格
					col = self.getPreColumn(field);
				}else{
					col = self.getColumnOptionByField(field);
				}
				if(col && col.resizable){
					$(this).css('cursor', 'e-resize');
				}
			}
		}).on("mousemove.resizable","div.opengrid-cell",function(e){
			var dir = getDirection($(this),e.pageX);
			if (dir == DIR_C) {
				$(this).css('cursor', 'default');
			} else {
				var col;
				var field = $(this).parent().attr("field");
				if(dir == DIR_W){
					//鼠标在单元格的左边界，缩放它的前一个单元格
					col = self.getPreColumn(field);
				}else{
					col = self.getColumnOptionByField(field);
				}
				if(col && col.resizable){
					$(this).css('cursor', 'e-resize');
				}
			}
		}).on("mousedown.resizable","div.opengrid-cell",function(e){
			var $cell = $(this);
			
			var dir = getDirection($(this),e.pageX);
			if (dir == DIR_C) return;
			
			var field = $cell.parent().attr("field");
			var col;
			if(dir == DIR_W){
				//鼠标在单元格的左边界，缩放它的前一个单元格
				col = self.getPreColumn(field);
				$cell  = $headers.find("."+col.cellClass);
				field = col.field;
			}else{
				col = self.getColumnOptionByField(field);
			}
			
			if(!col || !col.resizable){
				return;
			}
			
			var resizeData = {
				startWidth: col.boxWidth,
				startX : e.pageX,
				width : col.boxWidth
			};
			
			$(document).bind('mousedown.resizable', function(e){
				self.resizing = true;
				$headers.css("cursor", $("body").css("cursor"));
				if (!self.proxy) {
					self.proxy = $(
							"<div class=\"opengrid-resize-proxy\"></div>")
							.appendTo(dc.view);
				}
				self.proxy.css({
					left : e.pageX
							- $(panel).offset().left
							- 1,
					display : "none"
				});
				setTimeout(function() {
					if (self.proxy) {
						self.proxy.show();
					}
				}, 500);
				return false;
			});
			$(document).bind('mousemove.resizable', function(e){
				cellResize(e);
				self.proxy.css({
					left : e.pageX - $(panel).offset().left - 1,
					display : "block"
				});
				//applySize(e);
				return false;
			});
			$(document).bind('mouseup.resizable', function(e){
				cellResize(e);
				//applySize(e);
				$(document).unbind('.resizable');
				$headers.css("cursor", "");
				$cell.css("height", "");
				//col.width = col.$td.outerWidth();
				col.boxWidth = resizeData.width;
				col.isPercentWidth = false;
				col.isAutoWidth = false;
				arrayRemove(opts.percentWidthColumns, "field",col);
				arrayRemove(opts.autoWidthColumns, "field",col);
				$cell.css("width", "");
				self.fixColumnSize(field);
				self.proxy.remove();
				self.proxy = null;
				if ($cell.parents("div:first.opengrid-header").parent().hasClass("opengrid-view1")) {
					self.resizePanel();
				}
				//self.fitColumns();
				opts.onResizeColumn.call(self,field,col.width);
				setTimeout(function() {
					self.resizing = false;
				}, 0);
				return false;
			});
			
			
			function cellResize(e){
				var width = resizeData.startWidth + e.pageX - resizeData.startX;
				width = Math.min(
							Math.max(width, col.minWidth),
							col.maxWidth
						);
				resizeData.width = width;
			};
			
			function applySize(e){
				$cell.css({
					width: resizeData.width,
				});
			};
			
		});
		
		var $bodys = dc.body1.add(dc.body2);
		
		$bodys.on("mouseover","tr.opengrid-row",function(e){
			if (self.resizing) {
				return;
			}
			var tr = $(this);
			self.highlightRow(opts.bodyManager.getRowIndex(tr));
			e.stopPropagation();
		}).on("mouseout","tr.opengrid-row",function(e){
			var tr = $(this);
			opts.bodyManager.getTr(self, opts.bodyManager.getRowIndex(tr)).removeClass("opengrid-row-over");
			e.stopPropagation();
		}).on("contextmenu","td",function(e){
			var tr = $(this).parent("tr.opengrid-row");
			var rowIndex = opts.bodyManager.getRowIndex(tr);
			var row = opts.bodyManager.getRow(self, rowIndex);
			opts.onRowContextMenu.call(self, e, rowIndex, row);
			e.stopPropagation();
		}).on("click","td",function(e){
			var td = $(this);
			var tr = $(this).closest("tr.opengrid-row");
			var rowIndex = opts.bodyManager.getRowIndex(tr);
			var row = opts.bodyManager.getRow(self, rowIndex);
			if (td.length) {
				var field = td.attr("field");
				opts.onClickCell.call(self, rowIndex, field, row[field]);
			}
			if (opts.singleSelect == true) {
				self.selectRow(rowIndex);
			} else {
				if (tr.hasClass("opengrid-row-selected")) {
					self.unselectRow(rowIndex);
				} else {
					self.selectRow(rowIndex);
				}
			}
			opts.onClickRow.call(self, rowIndex, row);
		}).on("click","div.opengrid-cell",function(e){
			var cell = $(this);
			var tt = $(e.target);
			var tr = $(this).closest("tr.opengrid-row");
			var rowIndex = opts.bodyManager.getRowIndex(tr);
			if (cell.hasClass("opengrid-cell-check")) {
				if (opts.singleSelect && opts.selectOnCheck) {
					if (!opts.checkOnSelect) {
						self.uncheckAll(true);
					}
					self.checkRow(rowIndex);
				} else {
					if (tt.is(":checked")) {
						self.checkRow(rowIndex);
					} else {
						self.uncheckRow(rowIndex);
					}
				}
				e.stopPropagation();
			} else if(cell.hasClass("opengrid-cell-rowlink")){
				if (cell.hasClass("opengrid-rowlink-expanded")) {
					//已经展开,关闭
					self.hideSubGrid(rowIndex);
				} else {
					self.showSubGrid(rowIndex);
				}
				e.stopPropagation();
			}
		}).on("dblclick","div.opengrid-cell",function(e){
			var tt = $(e.target);
			var tr = $(this).closest("tr.opengrid-row");
			var rowIndex = opts.bodyManager.getRowIndex(tr);
			var row = opts.bodyManager.getRow(self, rowIndex);
			var td = tt.closest("td[field]", tr);
			if (td.length) {
				var field = td.attr("field");
				opts.onDblClickCell.call(self, rowIndex, field, row[field]);
			}
			opts.onDblClickRow.call(self, rowIndex, row);
			e.stopPropagation();
		});
		
		dc.body2.bind("scroll", function(e) {
			var b1 = dc.view1.children("div.opengrid-body");
			b1.scrollTop($(this).scrollTop());
			var c1 = dc.body1.children(":first");
			var c2 = dc.body2.children(":first");
			if (c1.length && c2.length) {
				var top1 = c1.offset().top;
				var top2 = c2.offset().top;
				if (top1 != top2) {
					b1.scrollTop(b1.scrollTop() + top1 - top2);
				}
			}
			dc.view2.children("div.opengrid-header").scrollLeft($(this).scrollLeft());
		});
	}
	/**
	 * 调整列宽
	 */
	gridproto.resize = function(params){
		var opts = this.options;
		var panel = this.panel;
		var dc = this.dc;
		if (params) {
			if (params.width) {
				opts.width = params.width;
			}
			if (params.height) {
				opts.height = params.height;
			}
		}
		if (opts.fit == true) {
			var p = panel.parent();
			opts.width = p.width();
			opts.height = p.height();
		}
		panel.css({
			width : opts.width,
			height : opts.height
		});
		this.resizePanel();
		this.fitColumns();
		this.removeScrollbar();
	};
	
	/**
	 * 当没有滚动条时，合并掉预留给滚动条的宽度
	 */
	gridproto.removeScrollbar = function(){
		logger.startTimeRecord("removeScrollbar");
		var self = this;
		var opts = this.options;
		var dc = this.dc;
		
		if(dc.body2[0].scrollWidth>dc.body2[0].clientWidth 
				|| dc.body2[0].offsetWidth>dc.body2[0].clientWidth){
			//有滚动条
			return;
		}
		
		/**
		 * 在没有横向滚动条时，得去掉右侧预留给滚动条的位置
		 * > 优先分配给宽度为百分比的列，
		 * > 没有宽度为百分比的列时，如果宽度为自适应，则将平分给其它列
		 */
		var header2 = dc.header2;
		var remainWidth = opts.scrollbarSize;
		var colsWidth = 0;
		var lastCol;
		if(opts.percentWidthColumns.length>0){
			//存在宽度为百分比的
			for ( var i = 0; i < opts.percentWidthColumns.length; i++) {
				var col = opts.percentWidthColumns[i];
				var w = parseInt(opts.scrollbarSize*col.width);
				remainWidth -=  w;
				setColWidth(col,w);
				lastCol = col;
				fix(col);
			}
		}else if(opts.fitColumns){
			//不存在宽度为百分比的
			for ( var i = 0; i < opts.allLeafColumns.length; i++) {
				var col = opts.allLeafColumns[i];
				if(notFixedCol(col)){
					colsWidth += col.width;
				}
			}
			var pwidth = opts.scrollbarSize/colsWidth;
			for ( var i = 0; i < opts.allLeafColumns.length; i++) {
				var col = opts.allLeafColumns[i];
				if(notFixedCol(col)){
					var w = parseInt(col.width * pwidth);
					remainWidth -=  w;
					setColWidth(col,w);
					lastCol = col;
					fix(col);
				}
			}
		}
		if(lastCol && remainWidth){
			setColWidth(lastCol,remainWidth);
			fix(lastCol);
		}
		logger.stopTimeRecord("removeScrollbar");
		 
		function fix(col){
			self.ss.set("."+col.cellClass, {width:col.boxWidth+"px"}); 
		}
		
		function setColWidth(col, width) {
			col.boxWidth += width;
		};
		function notFixedCol(col) {
			if ( !col.auto && !col.fixed && !col.hidden) {
				return true;
			}
		};
	}
	
	/**
	 * 设置面板宽度
	 */
	gridproto.resizePanel = function() {  
		logger.startTimeRecord("resizePanel"); 
	    var opts = this.options;   
	    var dc = this.dc;   
	    var panel = this.panel;   
	    var panelWidth = panel.width();   
	    var panelHeight = panel.height();  
	 
		dc.view.width(panelWidth);  
	    dc.header1.show();
	    //根据标题的表格宽度设置view1宽度   
	    dc.view1.width(dc.htable1.width());   
	    if(!opts.showHeader) {   
	        dc.header1.hide();   
	    }   
	    //view2的宽度设置为panel去除view1的宽度   
	    dc.view2.width(panelWidth - dc.view1.outerWidth());  
	 
	    //统一header body footer的宽度   
	    dc.view1.children("div.opengrid-header,div.opengrid-body").width(dc.view1.width());   
	    dc.view2.children("div.opengrid-header,div.opengrid-body").width(dc.view2.width());
	  
	    dc.header1.css("height", "");   
	    dc.header2.css("height", "");   
	    dc.htable1.css("height", "");   
	    dc.htable2.css("height", "");   
	
		
	    //获取两个视图表格较大的高度值，以此值设置两表格同步高度   
	    var hh = Math.max(dc.htable1.height(), dc.htable2.height());   
	    dc.htable1.height(hh);   
	    dc.htable2.height(hh);   
	    dc.header1.add(dc.header2).outerHeight(hh);
	
		if(opts.height != "auto") {   
	        var bodyHeight = panelHeight - dc.view2.children("div.opengrid-header").outerHeight();   
	        dc.view1.add(dc.view2).children("div.opengrid-body").css({   
	            height: bodyHeight   
	        });   
		} 
	    dc.view.height(dc.view2.height());   
		logger.stopTimeRecord("resizePanel"); 
	};  
	
	/**
	 * 调整列宽
	 * 下载三种情况需要调整列宽
	 * 1. 列宽有百分比
	 * 2. 列宽有'auto'
	 * 3. fitColumns=true时
	 */
	gridproto.fitColumns = function() {
		var opts = this.options;
		if(!opts.fitColumns && opts.autoWidthColumns.length==0 && opts.percentWidthColumns.length==0){
			return;
		}
		var dc = this.dc;
		
		/**
		 * 列宽算法：
		 * 	colsWidth = 计算叶子节点中宽度有实际值的列和
		 *  可用于分配给宽度为百分比的列的宽度 remainWidth = view的宽度-colsWidth
		 * 	将remainWidth按百分比分配给宽度为百分比的列
		 *  如果表格宽度是自适应的，则将剩余的宽度平均分配给列
		 */
		var colsWidth = 0;
		var notFixWidth = 0; //如果把剩余宽度分配给列宽是百分比的列后还有剩余，则将剩余的宽度按notFixWidth比例分配给notFixedCol
		for ( var i = 0; i <  opts.allLeafColumns.length; i++) {
			var col =  opts.allLeafColumns[i];
			if(!col.isPercentWidth && !col.hidden){
				if(notFixedCol(col)){//非固定列宽的
					notFixWidth += col.width;
				}
				colsWidth += col.width;
			}
		}
		
		var remainWidth = dc.view.innerWidth() - colsWidth - opts.scrollbarSize;
		if(remainWidth>0){
			var twidth = remainWidth;
			for(var i=0; i<opts.percentWidthColumns.length;i++){
				//有百分比的列,先设置百分比列
				var col = opts.percentWidthColumns[i];
				var w = twidth*col.width;
				if(w<col.minWidth){
					w =  col.minWidth;
				}
				remainWidth -= w;
				col.boxWidth = w-col.otherWidth; //实际宽度-填充边框的宽度
				notFixWidth += w;
				//this.fixColumnSize(col.field);
			}
		}else{
			//当剩余宽度不满足分配时，使用最小宽度
			for(var i=0; i<opts.percentWidthColumns.length;i++){
				//有百分比的列,先设置百分比列
				var col = opts.percentWidthColumns[i];
				var w = col.minWidth;
				remainWidth -= w;
				col.boxWidth = w-col.otherWidth; //实际宽度-填充边框的宽度
				notFixWidth += w;
				//this.fixColumnSize(col.field);
			}
		}
	
		var lastCol;
		if (opts.fitColumns && remainWidth) {
			//自适应 宽度时，多余的宽度平均分配到其它列
			var colWidthPer = remainWidth / notFixWidth;
			for ( var i = 0; i < opts.allLeafColumns.length; i++) {
				var col = opts.allLeafColumns[i];
				if (notFixedCol(col)) {
					var w = parseInt(col.width * colWidthPer);
					setColWidth(col, w);
					remainWidth -= w;
					lastCol = col;
					//this.fixColumnSize(col.field);
				}
			}
			if (lastCol) {
				setColWidth(lastCol, remainWidth);
				//this.fixColumnSize(lastCol.field);
			}
		}
		
		this.fixColumnSize();
		
	 	var panel = this.panel;   
	    var panelWidth = panel.width(); 
		dc.view1.width(dc.htable1.width());  
		dc.view2.width(panelWidth - dc.view1.outerWidth());   
		 
		function setColWidth(col, width) {
			col.boxWidth += width;
		};
		function notFixedCol(col) {
			if ( !col.auto && !col.fixed) {
				return true;
			}
		};
	};
	
	/**
	 * 固定列宽
	 * 表宽度调整后，需要将宽度值写入style中
	 */
	gridproto.fixColumnSize = function(field){
		var self = this;
		var opts = this.options;
		var dc = this.dc;
		if (field) {
			//固定指定列宽度
			var col = this.getColumnOptionByField(field);
			this.ss.set("." + col.cellClass,{
				width:col.boxWidth ? col.boxWidth+ "px" : "auto"
			});
		} else {
			for ( var i = 0; i < opts.allLeafColumns.length; i++) {
				var col = opts.allLeafColumns[i];
				this.ss.set("." + col.cellClass,{
					width:col.boxWidth ? col.boxWidth+ "px" : "auto"
				});
			}
		}
		this.fixMergeColumnSize();
		setTimeout(function() {
			self.fixRowHeight();
			self.setEditorColSize();
		}, 0);
	};
	
	/**
	 * 调整合并列宽度
	 */
	gridproto.fixMergeColumnSize = function() {
		var dc = this.dc;
		var self = this;
		dc.body1.add(dc.body2).find("td.opengrid-td-merged").each(function() {
			var td = $(this);
			var colspan = td.attr("colspan") || 1;
			var col = self.getColumnOptionByField(td.attr("field"));
			var width = col.boxWidth;
			for ( var i = 1; i < colspan; i++) {
				td = td.next();
				var col2 = self.getColumnOptionByField(td.attr("field"));
				width +=  col2.boxWidth + col2.otherWidth;
			}
			$(this).children("div.opengrid-cell").width(width);
		});
	};
	
	/**
	 * 调整正在编辑的列的宽度
	 */
	gridproto.setEditorColSize = function(){
		var self = this;
		this.dc.view.find("div.opengrid-editable").each(function() {
			var $this = $(this);
			var colField = $this.parent().attr("field");
			var col = self.getColumnOptionByField(colField);
			$this.outerWidth(col.$td.width());
			var ed = $.data(this, "opengrid.editor");
			if (ed.actions.resize) {
				ed.actions.resize(ed.target, $this.width());
			}
		});
	};
	
	/**
	 * 调整行的宽度适应内容
	 * @param field
	 * @returns
	 */
	gridproto.autoSizeColumn = function(field) {
		var opts = this.options;
		var dc = this.dc;
		if (!field) {
			return;
		} 
		dc.body2.width(10000); //先使表格宽度变得很大，列才能自适应
		var $td = dc.view.find("div.opengrid-header td[field=\"" + field
				+ "\"] div.opengrid-cell");
		$td.css("width", "");
		var col = this.getColumnOptionByField(field);
		var $bcells = dc.view.find("div.opengrid-body div."+col.cellClass);
		var $hcells = dc.view.find("div.opengrid-header div."+col.cellClass);
		var $cells = $hcells.add($bcells);
		$cells.width("auto");
		col.width = Math.max($bcells.closest("td").outerWidth(),$hcells.closest("td").outerWidth());
		col.boxWidth = Math.max($hcells.width(),$bcells.width());
		col.otherWidth = col.width - col.boxWidth;
		$cells.width("");
		arrayAdd(opts.autoWidthColumns,'field',col);
		col.isAutoWidth = true;
		if (opts.fitColumns) {
			this.fitColumns();
		}else{
			this.fixColumnSize(field);
		}
		this.resizePanel();
		
		opts.onResizeColumn.call(self, field, col.width);
	};
	
	
	/**  
	 * 设置行高  
	 */  
	gridproto.fixRowHeight = function(rowIndex, editing) {   
	    var opts = this.options;   
	    var dc = this.dc;   
		/**
		 * 当冻结视图不为空,需要同步view1,view2二个视图table内的行高,
		 * 有以下二种情况需要同步：  
		 * 1. autoRowHeight属性为true，即行高取决于内容
		 * 2. 有row处于可编辑状态
		 */
		//如果冻结视图为空，则不需要设置行高了
	    if(!dc.body1.is(":empty") && (opts.autoRowHeight  || editing)) { 
	        if(rowIndex != undefined) {
				//如果指定行    
	            //获取冻结列视图view1和普通列视图view2的行  
	            var tr1 = opts.bodyManager.getTr(this, rowIndex, "body", 1);   
	            var tr2 = opts.bodyManager.getTr(this, rowIndex, "body", 2);   
	            setTrHeight(tr1, tr2);   
	        }else {  
				//同步所有数据行高度  
				logger.startTimeRecord("fixRowHeight-allbody");
	            var trs1 = opts.bodyManager.getTr(this, 0, "allbody", 1);   
	            var trs2 = opts.bodyManager.getTr(this, 0, "allbody", 2);   
	 			for(var i = 0; i < trs1.length; i++) {   
		            var tr1 = trs1.eq(i);   
		            var tr2 = trs2.eq(i);  
					setTrHeight(tr1, tr2);
		        } 
				logger.stopTimeRecord("fixRowHeight-allbody");
	        }   
	    } 
		this.resizePanel(); //重新设置面板的大小  
	    //如果opengrid的height属性为auto，则根据实际数据行高度计算opengrid高度   
	    if(opts.height == "auto") {   
	        var body1 = dc.body1.parent();   
	        var body2 = dc.body2;   
	        var height = 0;   
	        var width = 0;  
	        body2.children().each(function() {   
	            var c = $(this);   
	            if(c.is(":visible")) {   
	                height += c.outerHeight();   
	                if(width < c.outerWidth()) {   
	                    width = c.outerWidth();   
	                }   
	            }   
	        });   
	        if(width > body2.width()) {   
	            height += 18;   
	        }   
	        body1.height(height);   
	        body2.height(height);   
	        dc.view.height(dc.view2.height());   
	    }   
	    dc.body2.triggerHandler("scroll");
	  
	    /**
	     * 取tr1和tr2高度的最大值为tr1,tr2的行高 
	     */  
		    function setTrHeight(tr1, tr2) {
				tr1[0].style.height = ""; 
				tr2[0].style.height = ""; 
	 			//tr1.css("height", "");   
	            //tr2.css("height", "");   
	            //var maxHeight = Math.max(tr1.height(), tr2.height());   
				var maxHeight = Math.max(tr1[0].offsetHeight,tr2[0].offsetHeight);
				tr1[0].style.height = maxHeight +"px";
				tr2[0].style.height = maxHeight +"px";
	            //tr1.css("height", maxHeight);   
	            //tr2.css("height", maxHeight);
	    };   
	};  
	
	/**
	 * 根据列名获取列属性
	 * 
	 * @param field
	 * @returns
	 */
	gridproto.getColumnByField = function(field) {
		for ( var i = 0; i < this.options.allLeafColumns.length; i++) {
			var col = this.options.allLeafColumns[i];
			if(col.field == field){
				return  col;
			}
		}
	};
	
	
	gridproto.getLeafColumns = function(isFrozen){
		var options = this.options;
		var columns = isFrozen ? options.frozenColumns : options.columns;
		if (columns.length == 0) {
			return [];
		}
		var cols  = [];
		
		getLeaf(columns[0]);// 从第一层检索
		function getLeaf(columns){
			for ( var i = 0; i < columns.length; i++) {
				var col = columns[i];
				if(col.children && col.children.length>0){
					getLeaf(col.children);
				}else{
					cols.push(col);
					col.isLeaf = true;
				}
			}
		}
		return cols;
	};
	
	/**
	 * 创建基本框架
	 */
	gridproto.renderFrame = function(){
		this.$container[0].innerHTML = "";//先清空内部元素
		
		var $wrap = $('<div class="opengrid-wrap opengrid">' +
				'<div class="opengrid-view">' +
				'<div class="opengrid-view1">' +
					'<div class="opengrid-header">' +
						'<div class="opengrid-header-inner"></div>' +
					'</div>' +
					'<div class="opengrid-body">' +
						'<div class="opengrid-body-inner">' +
						'</div>' +
					'</div>' +
				'</div>' +
				'<div class="opengrid-view2">' +
					'<div class="opengrid-header">' +
						'<div class="opengrid-header-inner"></div>' +
					'</div>' +
					'<div class="opengrid-body">'+ //注意，此处不能加opengrid-body-inner，body2是可以有横向滚动条的
					'</div>' +
				'</div>' +
				'<div class="opengrid-resize-proxy"></div>' +
			'</div>' +
		'</div>').insertAfter(this.$container);
		var view = $wrap.children("div.opengrid-view");
		var view1 = view.children("div.opengrid-view1");
		var view2 = view.children("div.opengrid-view2");
		var pview = $wrap.closest("div.opengrid-view");
		if (!pview.length) {
			pview = view;
		}
		this.ss = new styleManager(pview);
		this.panel = $wrap;
		this.dc =  {
			view : view,
			view1 : view1,
			view2 : view2,
			header1 : view1.children("div.opengrid-header").children("div.opengrid-header-inner"),
			header2 : view2.children("div.opengrid-header").children("div.opengrid-header-inner"),
			body1 : view1.children("div.opengrid-body").children("div.opengrid-body-inner"),
			body2 : view2.children("div.opengrid-body")
		};
	};
	
	
	gridproto.renderHeader =  function() {
		var opts = this.options;
		var dc = this.dc;
		var panel = this.panel;
		var self = this;
		panel.data("panel",$.extend({},opts));
		$(window).on("resize",function(){
			self.resize();
		});
		this.rowIdPrefix = "opengrid-row-r" + (++_rowid);
		this.cellClassPrefix = "opengrid-cell-c" + _rowid;
		this.renderHeaderTable(dc.header1, opts.frozenColumns, true);
		this.renderHeaderTable(dc.header2, opts.columns, false);
		this.renderStyle();
		dc.header1.add(dc.header2).css("display",
				opts.showHeader ? "block" : "none");
		
	};
	
	gridproto.renderHeaderTable = function(target, columns, isFrozenColumns) {
		if (!columns) {
			return;
		}
		
		$(target).show();
		$(target).empty();
		
		
		var obj = parserOrderBy(this.options.pagination.orderBy);
		var sortCols = obj.sortNames;
		var sortOrders = obj.sortOrders;
		
		var t = $(
				"<table class=\"opengrid-htable\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\"><tbody></tbody></table>")
				.appendTo(target);
		
		isFrozenColumns ? (this.dc.htable1 = t):(this.dc.htable2 = t);
		
		for ( var i = 0; i < columns.length; i++) {
			var tr = $("<tr class=\"opengrid-header-row\"></tr>").appendTo(
					$("tbody", t));
			var rowCols = columns[i];
			for ( var j = 0; j < rowCols.length; j++) {
				var col = rowCols[j];
				var attrs = "";
				
				if (col.rowspan > 1) {
					attrs += "rowspan=\"" + col.rowspan + "\" ";
				}
				if (col.colspan>1) {
					attrs += "colspan=\"" + col.colspan + "\" ";
				}
				
				var td = $("<td " + attrs + "></td>").appendTo(tr);
				col.$td = td;
				if (col.isLeaf) {
					td.attr({
						"field": col.field,
						"class": 'opengrid-header-td'
					});
					
					if(col.type == 'rownumber'){
						td.append("<div class=\"opengrid-cell opengrid-header-rownumber\"><span></span>"
								+(col.hformatter?col.hformatter():(col.title||''))+"</div>");
					}else if(col.type == 'checkbox'){
						td.append("<div class=\"opengrid-cell opengrid-header-check\">"
								+(col.hformatter?col.hformatter():"<input type=\"checkbox\"/>")
								+"</div>");
					}else if(col.type == 'rowlink'){
						td.append("<div class=\"opengrid-cell opengrid-header-rowlink\">"
								+(col.hformatter?col.hformatter():"<img class=\"opengrid-rowlink\" />")
								+"</div>");
					}else{
						td.append("<div class=\"opengrid-cell\"><span>"
								+(col.hformatter?col.hformatter():(col.title||''))
								+"</span>"+(col.sortable?"<span class=\"opengrid-sort-icon\">&nbsp;</span>":"")+"</div>");
					}
					var cell0 = td.find("div.opengrid-cell");
					var pos = arrayIndexOf(sortCols, col.field);
					if (pos >= 0) {
						cell0.addClass("opengrid-sort-" + sortOrders[pos]);
					}
					if (col.resizable == false) {
						cell0.attr("resizable", "false");
					}
					var width = (col.isPercentWidth || col.isAutoWidth ) ? col.minWidth : col.width ;
					cell0.width(width);
					col.otherWidth = td.outerWidth() - width; // 其它宽度，如边框，填充等
					width = width-col.otherWidth;
					cell0.width(width);
					col.boxWidth = width;
					cell0.css("text-align",
							(col.halign || "center"));
					col.cellClass = this.cellClassPrefix + "-"
							+ col.field.replace(/[\.|\s]/g, "-");
					cell0.addClass(col.cellClass).css("width", "");
				} else {
					$("<div class=\"opengrid-cell-group\"></div>")
							.html(col.title).appendTo(td).width(1);//添加width(1)解决多级表头时，二级或二级以上单元格宽度不受控制问题
				}
				
				if (col.hidden) {
					td.hide();
				}
			}
		}
		t.find(".opengrid-cell-group").width("");
		
	};
	
	
	/**
	 * 创建样式
	 */
	gridproto.renderStyle = function(){
		var clses = []; // 保存样式类与宽度
		for ( var i = 0; i < this.options.allLeafColumns.length; i++) {
			var col = this.options.allLeafColumns[i];
			clses.push([ "." + col.cellClass,{
				width:col.boxWidth ? col.boxWidth + "px" : "auto" 
			}]);
		}
		this.ss.add(clses);
		this.ss.dirty(this.cellSelectorPrefix);
		this.cellSelectorPrefix = "." + this.cellClassPrefix;
	};
	
	gridproto.loadData = function(params){
		var opts = this.options;
		var self = this;
		if(!params){
			params = {};
		}
		if (opts.onBeforeLoad.call(this, params) == false) {
			return;
		}
		// $(target).opengrid("loading"); //正在加载，显示正在加载内容
		// this.loading();
		setTimeout(function() {
			loading();
		}, 0);
		function loading() {
			var loaderResult = opts.loader.call(self,opts.url, params, function(data) {
				setTimeout(function() {
					// self.loaded();
				}, 0);
				self.setData(data); // 将行数据保存到data中
				self.renderBody();
			}, function() {
				setTimeout(function() {
					//$(target).opengrid("loaded");
				}, 0);
				opts.onLoadError.apply(self, arguments);
			});
			if (loaderResult == false) {
				//$(target).opengrid("loaded");
			}
		};
	};
	
	gridproto.loadChildrenData = function(field,index,params){
		var opts = this.options;
		var self = this;
		var col = this.getColumnOptionByField(field);
		if(!col){
			return;
		}
		var onBeforeLoad = col.onBeforeLoad||opts.onBeforeLoad;
		
		if(!params){
			params = {};
		}
		if (onBeforeLoad.call(this, params,this.data[index]) == false) {
			return;
		}
		// $(target).opengrid("loading"); //正在加载，显示正在加载内容
		// this.loading();
		setTimeout(function() {
			loading();
		}, 0);
		function loading() {
			var loader = col.loader || opts.loader;
			var url = col.url || opts.url;
			var loaderResult = loader.call(self,url, params, function(data) {
				setTimeout(function() {
					// self.loaded();
				}, 0);
				//self.setChildrenData(index,data); // 将行数据保存到data中
				self.renderChildrenBody(index,data);
			}, function() {
				setTimeout(function() {
					//$(target).opengrid("loaded");
				}, 0);
				opts.onLoadError.apply(self, arguments);
			});
			if (loaderResult == false) {
				//$(target).opengrid("loaded");
			}
		};
	};
	
	
	gridproto.setData = function(data){
		if(!data.data){
			this.data = [];
		}else{
			this.data = data.data;
		}
		
		$.extend(this.options.pagination,data.pagination);
		
		var originalRows = [];
		for ( var i = 0; i < this.data.length; i++) {
			originalRows.push($.extend({}, this.data[i]));
		}
		this.originalRows = originalRows;
		this.updatedRows = [];
		this.insertedRows = [];
		this.deletedRows = [];
	};
	
	gridproto.groupStat = function(){
		var opts = this.options;
		if(!opts.groupBy){
			return;
		}
		var data = this.data;
		var groupNames = opts.groupBy.split(",");
		
		/**
		 * 对数据进行分组排序,将同一组的数据放到一块
		 */
		var group = function(data,gKey){
			var rows = [];
			for ( var i = 0; i < data.length; i++) {
				var row = data[i];
				var exist = false;
				for ( var j = 0; j < rows.length; j++) {
					if(row[gKey] == rows[j][0]){
						rows[j][1].push(row);
						exist = true;
						break;
					}
				}
				if(!exist){
					rows.push([row[gKey],[row]]);
				}
			}
			return rows;
		}
		
		/**
		 * 依次根据分组字段对数据进行分组组合,即将同一组的数据放到一块
		 */
		var rows = [['',data]];
		for ( var i = 0; i < groupNames.length; i++) {
			var nrows = [];
			for ( var j = 0; j < rows.length; j++) {
				nrows = nrows.concat(group(rows[j][1],groupNames[i]));
			}
			rows = nrows;
		}
		
		this.data = [];
		//将分组组合后的数据，放到data中
		for ( var i = 0; i < rows.length; i++) {
			this.data = this.data.concat(rows[i][1]);
		}
		
		//设置分组信息
		var groupInfo = [];
	
		for ( var i = 0; i < groupNames.length; i++) {
			var group = {}; //preVal
			group.key = groupNames[i];
			group.index = 0;
			groupInfo.push(group);
		}
		
		/**
		 * 重置group信息
		 */
		var resetGroup = function(index,row){
			for ( var i = index; i < groupInfo.length; i++) {
				var group = groupInfo[i];
				if(group.first){
					group.first["_"+group.key+"_gcount"] = group.count;
				}
				group.preVal = row[group.key];
				group.count =  1;
				group.first = row;
				row["_"+group.key+"_grownumber"] = 0;
				row["_"+group.key+"_rownumber"] = group.index++;
				if(i>index){
					group.index = 0;
					row["_"+group.key+"_rownumber"] = group.index++;
				}
			}
		};
		
		/**
		 * 给数据添加分组信息
		 */
		for ( var i = 0; i < this.data.length; i++) {
			var row = this.data[i];
			for ( var j = 0; j < groupInfo.length; j++) {
				var group  = groupInfo[j];
				var val = row[group.key];
				if(val == group.preVal){
					row["_"+group.key+"_grownumber"] = group.count++;
				}else{
					resetGroup(j,row);
					break;
				}
			}
		}
		resetGroup(0,{});
	};
	
	gridproto.renderBody = function(){
		logger.startTimeRecord("creategrid");
		var self = this;
		var opts = this.options;
		var dc = this.dc;
		// 客户端排序
		if (!opts.remoteSort && opts.pagination.orderBy) {
			var obj = parserOrderBy(opts.pagination.orderBy);
			var sortNames = obj.sortNames;
			var sortOrders = obj.sortOrders;
			this.data.sort(function(r1, r2) {
				var r = 0;
				for ( var i = 0; i < sortNames.length; i++) {
					var sn = sortNames[i];
					var so = sortOrders[i];
					var col = self.getColumnByField(sn);
					var sorter = col.sorter || function(a, b) {
						return a == b ? 0 : (a > b ? 1 : -1);
					};
					
					var a = r1[sn];
					var b= r2[sn];
					switch(col.type){
						case 'number':
						case 'percent':
							a = parseFloat(r1[sn]);
							if(isNaN(a)){
								a = r1[sn];
							}
							b = parseFloat(r2[sn]);
							if(isNaN(b)){
								b = r2[sn];
							}
							break;
					}
					r = sorter(a, b) * (so == "asc" ? 1 : -1);
					if (r != 0) {
						return r;
					}
				}
				return r;
			});
		}
		
		if(opts.groupBy){
			//分组
			var groupNames = opts.groupBy.split(",");
			this.groupStat();
		}
		// 创建前事件
		if (opts.bodyManager.onBeforeRender) {
			opts.bodyManager.onBeforeRender.call(opts.bodyManager,this, this.data);
		}
		
		if(this.data && this.data.length>0){
			logger.startTimeRecord("create body2");
			opts.bodyManager.render.call(opts.bodyManager, this,dc.body2, false);
			logger.stopTimeRecord("create body2");
			
			logger.startTimeRecord("create body1");
			opts.bodyManager.render.call(opts.bodyManager,this, dc.body1, true);
			logger.stopTimeRecord("create body1");
			
			if (opts.bodyManager.onAfterRender) {
				opts.bodyManager.onAfterRender.call(opts.bodyManager,this);
			}
		}else if(opts.emptyMsg){
			dc.body1.empty();
			dc.body1.append("<div class=\"opengrid-emptymsg\">&nbsp;</div>");
			dc.body2.empty();
			dc.body2.append("<div class=\"opengrid-emptymsg\">"+opts.emptyMsg+"</div>");
		}
		
		
		//设置宽度为auto的列的宽度
		for ( var i = 0; i < opts.autoWidthColumns.length; i++) {
			var col = opts.autoWidthColumns[i];
			var field = col.field;
			var $bcells = dc.view.find("div.opengrid-body div."+col.cellClass);
			var $hcells = dc.view.find("div.opengrid-header div."+col.cellClass);
			var $cells = $hcells.add($bcells);
			$cells.width("auto");
			col.width = Math.max($bcells.closest("td").outerWidth(),$hcells.closest("td").outerWidth());
			col.boxWidth = Math.max($hcells.width(),$bcells.width());
			col.otherWidth = col.width - col.boxWidth;
			$cells.width("");
		}
		/*if(opts.autoWidthColumns.length>0){
			
		}*/
		logger.startTimeRecord("resize");
		this.resize();
		logger.stopTimeRecord("resize");
		//this.ss.clean();
		opts.onLoadSuccess.call(this, this.data);
		
		logger.startTimeRecord("fixRowHeight");
		 this.fixRowHeight();
		logger.stopTimeRecord("fixRowHeight");
		dc.body2.triggerHandler("scroll");
		
		//还原状态
		if (opts.idField) {
			for ( var i = 0; i < this.data.length; i++) {
				var row = this.data[i];
				if (arrayIndexOf(this.selectedRows, row, opts.idField)>-1) {
					opts.bodyManager.getTr(this, i).addClass("opengrid-row-selected");
				}
				if (arrayIndexOf(this.checkedRows, row,opts.idField)>-1) {
					opts.bodyManager.getTr(this, i).find("div.opengrid-cell-check input[type=checkbox]")
							.attr("checked", "checked");
				}
			}
		}
		
		logger.stopTimeRecord("creategrid");
	};
	
	
	gridproto.renderChildrenBody = function(rowIndex,data){
		if(!data || !data.data){
			return;
		}
		logger.startTimeRecord("renderChildrenBody");
		var self = this;
		var opts = this.options;
		var dc = this.dc;
		
		var row = this.data[rowIndex];
		if(!row || row._children){
			//rowIndex有问题，或者已经获取过子行了
			return;
		}
		data = data.data;
		row.children = data;
			
		// 客户端排序
		if (!opts.remoteSort && opts.pagination.orderBy) {
			var obj = parserOrderBy(opts.pagination.orderBy);
			var sortNames = obj.sortNames;
			var sortOrders = obj.sortOrders;
			data.sort(function(r1, r2) {
				var r = 0;
				for ( var i = 0; i < sortNames.length; i++) {
					var sn = sortNames[i];
					var so = sortOrders[i];
					var col = self.getColumnByField(sn);
					var sorter = col.sorter || function(a, b) {
						return a == b ? 0 : (a > b ? 1 : -1);
					};
					r = sorter(r1[sn], r2[sn]) * (so == "asc" ? 1 : -1);
					if (r != 0) {
						return r;
					}
				}
				return r;
			});
		}
		// 创建前事件
		if (opts.bodyManager.onBeforeRender) {
			opts.bodyManager.onBeforeRender.call(opts.bodyManager,this, data);
		}
		
		//更新行数据标识，行号
		for ( var i = this.data.length - 1; i > rowIndex; i--) {
			var nrowindex = i+data.length;
			var tr1 = opts.bodyManager.getTr(this, i, "body", 1);
			var tr2 = opts.bodyManager.getTr(this, i, "body", 2);
			
			tr1.attr("opengrid-row-index", nrowindex);
			tr1.attr("id",this.rowIdPrefix + "-1-"+ nrowindex );
			tr2.attr("opengrid-row-index", nrowindex);
			tr2.attr("id", this.rowIdPrefix + "-2-"+ nrowindex);
			
			if (opts.striped) {
				tr1.removeClass("opengrid-row-alt").addClass(nrowindex % 2 ? "opengrid-row-alt" : "");
				tr2.removeClass("opengrid-row-alt").addClass(nrowindex % 2 ? "opengrid-row-alt" : "");
			}
		}
		Array.prototype.splice.apply(this.data,[rowIndex+1,0].concat(data));
		
		
		opts.bodyManager.renderChildren.call(opts.bodyManager, this,dc.body2,rowIndex, false);
		opts.bodyManager.renderChildren.call(opts.bodyManager,this, dc.body1,rowIndex, true);
		
		if (opts.bodyManager.onAfterRender) {
			opts.bodyManager.onAfterRender.call(opts.bodyManager,this);
		}
		
		//设置宽度为auto的列的宽度
		for ( var i = 0; i < opts.autoWidthColumns.length; i++) {
			var col = opts.autoWidthColumns[i];
			var field = col.field;
			var $bcells = dc.view.find("div.opengrid-body div."+col.cellClass);
			var $hcells = dc.view.find("div.opengrid-header div."+col.cellClass);
			var $cells = $hcells.add($bcells);
			$cells.width("auto");
			col.width = Math.max($bcells.closest("td").outerWidth(),$hcells.closest("td").outerWidth());
			col.boxWidth = Math.max($hcells.width(),$bcells.width());
			col.otherWidth = col.width - col.boxWidth;
			$cells.width("");
		}
		if(opts.autoWidthColumns.length>0){
			this.resize();
		}
		this.ss.clean();
		//opts.onLoadChildrenSuccess.call(this, this.data);
		 this.fixRowHeight();
		dc.body2.triggerHandler("scroll");
		
		//还原状态
		if (opts.idField) {
			for ( var i = 0; i < data.length; i++) {
				var row = data[i];
				if (arrayIndexOf(this.selectedRows, row, opts.idField)>-1) {
					opts.bodyManager.getTr(this, i).addClass("opengrid-row-selected");
				}
				if (arrayIndexOf(this.checkedRows, row,opts.idField)>-1) {
					opts.bodyManager.getTr(this, i).find("div.opengrid-cell-check input[type=checkbox]")
							.attr("checked", "checked");
				}
			}
		}
		logger.stopTimeRecord("renderChildrenBody");
	};
	
	var styleManager = function(container){
		this.cc = container || $("head");
		this.cache = {};
		this.dirtyCls = [];
	};
	
	var styleMngProto = styleManager.prototype;
	styleMngProto.add = function(clses) {
		var self = this;
		var ss = [ "<style type=\"text/css\">" ];
		for ( var i = 0; i < clses.length; i++) {
			this.cache[clses[i][0]] = clses[i][1];
		}
		var _d = 0;
		for ( var s in this.cache) {
			var cls = this.cache[s];
			cls.index = _d++;
			s += "{";
			for(var p in cls){
				if(p != 'index'){
					s += p+":"+cls[p]+";";
				}
			}
			s +="}"
			ss.push(s);
		}
		ss.push("</style>");
		$(ss.join("\n")).appendTo(this.cc);
		setTimeout(function() {
			self.cc.children("style:not(:last)").remove();
		}, 0);
	};
	styleMngProto.getRule = function(index) {
		var style = this.cc.children("style:last")[0];
		var styleSheet = style.styleSheet ? style.styleSheet
				: (style.sheet || document.styleSheets[document.styleSheets.length - 1]);
		var cssRules = styleSheet.cssRules || styleSheet.rules;
		return cssRules[index];
	};
	styleMngProto.set = function(cls, pros) {
		var cls = this.cache[cls];
		if (cls) {
			$.extend(true,cls,pros);
			var rule = this.getRule(cls.index);
			if (rule) {
				for(var p in cls){
					if(p != 'index'){
						rule.style[p] = cls[p];
					}
				}
			}
		}
	};
	styleMngProto.remove = function(cs) {
		var tmp = [];
		for ( var s in this.cache) {
			if (s.indexOf(cs) == -1) {
				tmp.push([ s, this.cache[s] ]);
			}
		}
		this.cache = {};
		this.add(tmp);
	};
	styleMngProto.dirty = function(cls) {
		if (cls) {
			this.dirtyCls.push(cls);
		}
	};
	styleMngProto.clean = function() {
		for ( var i = 0; i < this.dirtyCls.length; i++) {
			this.remove(this.dirtyCls[i]);
		}
		this.dirtyCls = [];
	};
	
	
	$.fn.opengrid = function(options) {
		if (typeof options == "string") {
			var opengrid = $.data(this[0], "opengrid");
			if(!opengrid){
				return;
			}
			var method = $.fn.opengrid.methods[options]; //优先取methods中方法
			if(method){
				return method.apply(opengrid, Array.prototype.slice.call(arguments,1));
			}
			if(opengrid[options]){
				return opengrid[options].apply(opengrid,Array.prototype.slice.call(arguments,1));
			}
			return null;
		}
		return this.each(function() {
			var opengrid = $.data(this, "opengrid");
			if(opengrid){
				return;
			}
			$.data(this, "opengrid", new OpenGrid($(this),options));
		});
	};
	
	
	/**
	 * 行管理器
	 */
	var bodyManager  = {
			render : function(context,body, isFrozenColumns) {
				var opts = context.options;
				var rows = context.data;
				var cols = isFrozenColumns?opts.leafFrozenColumns:opts.leafColumns;
				if(!cols || cols.length==0){
					return;
				}
				var strs = [ "<table class=\"opengrid-btable\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\"><tbody>" ];
				
				for ( var i = 0; i < rows.length; i++) {
					rows[i]._id = getId();
					var css = opts.rowStyler ? opts.rowStyler
							.call(context, i, rows[i]) : "";
					var cls = "";
					var style = "";
					if (typeof css == "string") {
						style = css;
					} else if (css) {
						cls = css["class"] || "";
						style = css["style"] || "";
					}
					var cls = "class=\"opengrid-row "
							+ (i % 2 && opts.striped ? "opengrid-row-alt " : " ")
							+ cls + "\"";
					style = style ? "style=\"" + style + "\"" : "";
					var rowId = context.rowIdPrefix + "-" + (isFrozenColumns ? 1 : 2) + "-" + i;
					strs.push("<tr id=\"" + rowId + "\" opengrid-row-index=\"" + i
							+ "\" " + cls + " " + style + ">");
					strs.push(this.renderRow.call(this,context, cols, isFrozenColumns, i,
							rows[i]));
					strs.push("</tr>");
				}
				strs.push("</tbody></table>");
				body.html(strs.join(""));
			},
			renderRow : function(context,cols, isFrozenColumns, rowIndex, row) {
				var opts = context.options;
				var cc = [];
				for ( var i = 0; i < cols.length; i++) {
					// var field = fields[i];
					// var col = $(target).opengrid("getColumnOption", field);
					var col = cols[i];
					var field = col.field;
					var val = row[field];
					
					var isrownumber = col.type == 'rownumber';
					var ischeckbox = col.type == 'checkbox';
					var isrowlink = col.type == 'rowlink';
					var showrowlink = isrowlink && col.rule && col.rule(val, row, rowIndex);
					
					if(col._rownumber){
						if(col._group){
							val = row["_"+col.type]+1;
						}else{
							var rowNumber = rowIndex + 1;
							if(opts.pagination.pageNo && opts.pagination.pageSize){
								rowNumber += (opts.pagination.pageNo - 1) * opts.pagination.pageSize;
							}
							val = rowNumber; 
						}
					}else if(col._grownumber){
						val = row["_"+col.type]+1;
					}
					
					var css = col.styler ? (col.styler(val, row, rowIndex) || "")
							: "";
					var cls = "";
					var style = "";
					if (typeof css == "string") {
						style = css;
					} else {
						if (cc) {
							cls = css["class"] || "";
							style = css["style"] || "";
						}
					}
				
					if(isrownumber){
						cls += " opengrid-td-rownumber ";
					}else if(isrowlink){
						cls += ' opengrid-td-rowlink';
					}
					
					
					var cls = cls ? "class=\"" + cls + "\"" : "";
					var styleStr = col.hidden ? "style=\"display:none;" + style
							+ "\"" : (style ? "style=\"" + style + "\"" : "");
					
					var rowspan = "";
					if(col._group){
						//分组
						var field = col.field;
						if(col._rownumber){
							field = col._gfield;
						}
						
						if(row["_"+field+"_grownumber"] == 0 ){
							rowspan = "rowspan=\""+row["_"+field+"_gcount"]+"\""; 
						}else{
							//不是首行，隐藏掉
							styleStr = "style=\"display:none;" + style + "\"";
						}
					}
					
					cc.push("<td field=\"" + field + "\" " + cls + " " + styleStr+ " " + rowspan + ">");
							
					
					
					var styleStr = style;
					if (col.align) {
						styleStr += ";text-align:" + col.align + ";";
					}
					if (col.nowrap) {
						styleStr += ";white-space:nowrap;word-wrap: normal;overflow: hidden;";
					}else{
						styleStr += ";white-space:normal;";
					}
					styleStr += ";height:auto;";
					cc.push("<div style=\"" + styleStr + "\" ");
					
					var cellClass = "";
					if(isrownumber){
						cellClass = " opengrid-cell-rownumber ";
					}else if(ischeckbox){
						cellClass = " opengrid-cell-check ";
					}else if(isrowlink && showrowlink){
						cellClass = " opengrid-cell-rowlink ";
					}
					cc.push( "class=\"opengrid-cell " + cellClass + col.cellClass + "\"");
					cc.push(">");
					if (ischeckbox) {
						cc.push("<input type=\"checkbox\" name=\"" + field
								+ "\" value=\""
								+ (val != undefined ? val : "") + "\">");
					} else if(isrowlink){
						if(col.rule){
							if(showrowlink){
								cc.push("<img class=\"opengrid-rowlink\" />");
							}
						}else if(col.formatter){
							if(typeof col.formatter == 'string'){
								cc.push(window[col.formatter](val, row, rowIndex,col));
							}else{
								cc.push(col.formatter(val, row, rowIndex,col));
							}
							
						}else{
							cc.push("<img class=\"opengrid-rowlink\" />");
						}
					} else {
						if (col.formatter) {
							if(typeof col.formatter == 'string'){
								cc.push(window[col.formatter](val, row, rowIndex,col));
							}else{
								cc.push(col.formatter(val, row, rowIndex,col));
							}
						} else {
							cc.push(val);
						}
					}
					cc.push("</div>");
					cc.push("</td>");
				}
				return cc.join("");
			},
			renderChildren:function(context,body,rowIndex,isFrozen){
				var opts = context.options;
				var rows = context.data[rowIndex].children;
				var tr = opts.bodyManager.getTr(context, rowIndex, "body", (isFrozen ? 1 : 2));
				if(!rows){
					return;
				}
				var cols = isFrozen?opts.leafFrozenColumns:opts.leafColumns;
				if(!cols || cols.length==0){
					return;
				}
				
				var strs = [];
				
				for ( var i = 0; i < rows.length; i++) {
					rows[i]._id = getId();
					var crowIndex = rowIndex + i + 1;
					var css = opts.rowStyler ? opts.rowStyler.call(context, crowIndex, rows[i]) : "";
					var cls = "";
					var style = "";
					if (typeof css == "string") {
						style = css;
					} else if (css) {
						cls = css["class"] || "";
						style = css["style"] || "";
					}
					var cls = "class=\"opengrid-row opengrid-subrow "
							+ (i % 2 && opts.striped ? "opengrid-row-alt " : " ")
							+ cls + "\"";
					style = style ? "style=\"" + style + "\"" : "";
					var rowId = context.rowIdPrefix + "-" + (isFrozen ? 1 : 2) + "-" + crowIndex;
					strs.push("<tr id=\"" + rowId + "\" pid=\"" + tr.attr("id") + "\" opengrid-row-index=\"" + crowIndex
							+ "\" " + cls + " " + style + ">");
					strs.push(this.renderChildrenRow.call(this,context, cols, isFrozen, crowIndex,
							rows[i]));
					strs.push("</tr>");
				}
				tr.after(strs.join(""));
			},
			renderChildrenRow : function(context,cols, isFrozenColumns, rowIndex, row) {
				var opts = context.options;
				var cc = [];
				for ( var i = 0; i < cols.length; i++) {
					// var field = fields[i];
					// var col = $(target).opengrid("getColumnOption", field);
					var col = cols[i];
					var field = col.field;
					var val = row[field];
					
					var isrownumber = col.type == 'rownumber';
					var ischeckbox = col.type == 'checkbox';
					var isrowlink = col.type == 'rowlink';
					
					/*if(isrownumber){
						var rowNumber = rowIndex + 1;
						if(opts.pagination.pageNo && opts.pagination.pageSize){
							rowNumber += (opts.pagination.pageNo - 1) * opts.pagination.pageSize;
						}
						val = rowNumber; 
					}*/
					
					
					var css = col.styler ? (col.styler(val, row, rowIndex) || "")
							: "";
					var cls = "";
					var style = "";
					if (typeof css == "string") {
						style = css;
					} else {
						if (cc) {
							cls = css["class"] || "";
							style = css["style"] || "";
						}
					}
				
					if(isrownumber){
						cls += " opengrid-td-rownumber ";
					}else if(isrowlink){
						cls += ' opengrid-td-rowlink';
					}
					
					
					var cls = cls ? "class=\"" + cls + "\"" : "";
					var styleStr = col.hidden ? "style=\"display:none;" + style
							+ "\"" : (style ? "style=\"" + style + "\"" : "");
					cc.push("<td field=\"" + field + "\" " + cls + " " + styleStr
							+ ">");
					var styleStr = style;
					if (col.align) {
						styleStr += ";text-align:" + col.align + ";";
					}
					if (!col.nowrap) {
						styleStr += ";white-space:normal;";
					}
					styleStr += ";height:auto;";
					cc.push("<div style=\"" + styleStr + "\" ");
					
					var cellClass = "";
					if(isrownumber){
						cellClass = " opengrid-cell-rownumber ";
					}else if(ischeckbox){
						cellClass = " opengrid-cell-check ";
					}else if(isrowlink){
						/*cellClass = " opengrid-cell-rowlink ";*/
					}
					cc.push( "class=\"opengrid-cell " + cellClass + col.cellClass + "\"");
					cc.push(">");
					if (ischeckbox) {
						/*cc.push("<input type=\"checkbox\" name=\"" + field
								+ "\" value=\""
								+ (val != undefined ? val : "") + "\">");*/
					} else if(isrowlink){
						/*if(col.rule){
							if(col.rule(val, row, rowIndex)){
								cc.push("<img class=\"opengrid-rowlink\" />");
							}
						}else if(col.formatter){
							cc.push(col.formatter(val, row, rowIndex));
						}else{
							cc.push("<img class=\"opengrid-rowlink\" />");
						}*/
					} else {
						if (col.formatter) {
							cc.push(col.formatter(val, row, rowIndex));
						} else {
							cc.push(val);
						}
					}
					cc.push("</div>");
					cc.push("</td>");
				}
				return cc.join("");
			},
			refreshRow : function(context, rowIndex) {
				this.updateRow.call(this, context, rowIndex, {});
			},
			updateRow : function(context, rowIndex, row) {
				var opts = context.options;
				var rows = context.data;
				$.extend(rows[rowIndex], row);
				var css = opts.rowStyler ? opts.rowStyler.call(context, rowIndex,
						rows[rowIndex]) : "";
				var clses = "";
				var style = "";
				if (typeof css == "string") {
					style = css;
				} else {
					if (css) {
						clses = css["class"] || "";
						style = css["style"] || "";
					}
				}
				var clses = "opengrid-row "
						+ (rowIndex % 2 && opts.striped ? "opengrid-row-alt " : " ")
						+ clses;
				function renderRow(isFrozen) {
					var cols = isFrozen ? opts.leafFrozenColumns : opts.leafColumns;
					var tr = opts.bodyManager.getTr(context, rowIndex, "body", (isFrozen ? 1 : 2));
					var isCheckbox = tr.find(
							"div.opengrid-cell-check input[type=checkbox]").is(
							":checked");
					tr.html(this.renderRow.call(this, context, cols, isFrozen, rowIndex,
							rows[rowIndex]));
					tr.attr("style", style).attr(
							"class",
							tr.hasClass("opengrid-row-selected") ? clses
									+ " opengrid-row-selected" : clses);
					if (isCheckbox) {
						tr.find("div.opengrid-cell-check input[type=checkbox]")
								.attr("checked", "checked");
					}
				}
				;
				renderRow.call(this, true);
				renderRow.call(this, false);
				context.fixRowHeight(rowIndex);
			},
			insertRow : function(context, rowIndex, row) {
				row._id = getId();
				var opts = context.options;
				var dc = context.dc;
				var data = context.data;
				if (rowIndex == null || rowIndex > context.data.length) {
					rowIndex = context.data.length;
				}
				if(rowIndex<0){
					rowIndex = 0;
				}
				
				//更新行数据标识，行号
				for ( var i = data.length - 1; i >= rowIndex; i--) {
					var tr1 = opts.bodyManager.getTr(context, i, "body", 1);
					var tr2 = opts.bodyManager.getTr(context, i, "body", 2);
					
					tr1.attr("opengrid-row-index", i+1);
					tr1.attr("id",context.rowIdPrefix + "-1-"+ (i + 1) );
					tr2.attr("opengrid-row-index", i+1);
					tr2.attr("id", context.rowIdPrefix + "-2-"+ (i + 1));
					
					if(opts.rownumbers){
						//显示行号时，更新行号
						var rownumber = i + 2; //行号递增一位
						if(opts.pagination.pageNo && opts.pagination.pageSize){
							rownumber += (opts.pagination.pageNo - 1) * opts.pagination.pageSize; 
						}
						tr1.find("div.opengrid-cell-rownumber").html(rownumber);
						tr2.find("div.opengrid-cell-rownumber").html(rownumber);
					}
					if (opts.striped) {
						tr1.removeClass("opengrid-row-alt").addClass((i + 1) % 2 ? "opengrid-row-alt" : "");
						tr2.removeClass("opengrid-row-alt").addClass((i + 1) % 2 ? "opengrid-row-alt" : "");
					}
				}
				//插入空行
				var tr1 = "<tr id=\"" + context.rowIdPrefix + "-1-" + rowIndex 
								+ "\" class=\"opengrid-row\" opengrid-row-index=\""+ rowIndex + "\"></tr>";
				var tr2 = "<tr id=\"" + context.rowIdPrefix + "-2-" + rowIndex 
								+ "\" class=\"opengrid-row\" opengrid-row-index=\""+ rowIndex + "\"></tr>";
				if(data.length==0){
					//没有数据，是空表
					dc.body1.html("<table cellspacing=\"0\" cellpadding=\"0\" border=\"0\"><tbody>"
									+ tr1 + "</tbody></table>");
					dc.body2.html("<table cellspacing=\"0\" cellpadding=\"0\" border=\"0\"><tbody>"
							+ tr2 + "</tbody></table>");
				}else{
					//不是空表
					if(rowIndex==0){
						//在第一行插入
						opts.bodyManager.getTr(context, rowIndex+1, "body", 1).before(tr1);
						opts.bodyManager.getTr(context, rowIndex+1, "body", 2).before(tr2);
					}else{
						opts.bodyManager.getTr(context, rowIndex, "body", 1).after(tr1);
						opts.bodyManager.getTr(context, rowIndex, "body", 2).after(tr2);
					}
				}
				opts.pagination.total += 1;;
				data.splice(rowIndex, 0, row);
				this.refreshRow.call(this, context, rowIndex);
			},
			deleteRow : function(context, rowIndex) {
				if(!rowIndex){
					return;
				}
				rowIndex = parseInt(rowIndex,10);
				
				var opts = context.options;
				var data = context.data;
				opts.bodyManager.getTr(context, rowIndex).remove();
				//更新行标识，行号
				for ( var i = rowIndex + 1; i < data.length; i++) {
					var tr1 = opts.bodyManager.getTr(context, i, "body", 1);
					var tr2 = opts.bodyManager.getTr(context, i, "body", 2);
					tr1.attr("opengrid-row-index", i - 1);
					tr1.attr("id", context.rowIdPrefix + "-1-" + (i - 1));
					
					tr2.attr("opengrid-row-index", i - 1);
					tr2.attr("id", context.rowIdPrefix + "-2-" + (i - 1));
					if (opts.rownumbers) {
						//更新行号
						var rownumber = i; //行号减1
						if(opts.pagination.pageNo && opts.pagination.pageSize){
							rownumber += (opts.pagination.pageNo - 1) * opts.pagination.pageSize; 
						}
						tr1.find("div.opengrid-cell-rownumber").html(rownumber);
						tr2.find("div.opengrid-cell-rownumber").html(rownumber);
					}
					if (opts.striped) {
						tr1.removeClass("opengrid-row-alt").addClass((i - 1) % 2 ? "opengrid-row-alt" : "");
						tr2.removeClass("opengrid-row-alt").addClass((i - 1) % 2 ? "opengrid-row-alt" : "");
					}
				}
				data.total -= 1;
				opts.pagination.total = data.total;
				data.splice(rowIndex, 1);
			},
			onBeforeRender : function(context, rows) {
			},
			onAfterRender : function(context) {
			},
			getTr : function(context, rowIndex, type, idNum) {
				type = type || "body";
				idNum = idNum || 0;
				var dc = context.dc;
				var opts = context.options;
				if (idNum == 0) {
					var tr1 = opts.bodyManager.getTr(context, rowIndex,
							type, 1);
					var tr2 = opts.bodyManager.getTr(context, rowIndex,
							type, 2);
					return tr1.add(tr2);
				} else {
					switch(type){
						case 'body':
							var tr = $("#" + context.rowIdPrefix + "-"
									+ idNum + "-" + rowIndex);
							if (!tr.length) {
								tr = (idNum == 1 ? dc.body1
										: dc.body2)
										.find(">table>tbody>tr[opengrid-row-index="
												+ rowIndex + "]");
							}
							return tr;
						case 'selected':
							return (idNum == 1 ? dc.body1
									: dc.body2)
									.find(">table>tbody>tr.opengrid-row-selected");
						case 'highlight':
							return (idNum == 1 ? dc.body1
									: dc.body2)
									.find(">table>tbody>tr.opengrid-row-over");
						case 'checked':
							return (idNum == 1 ? dc.body1
									: dc.body2)
									.find(">table>tbody>tr.opengrid-row-checked");
						case 'last':
							return (idNum == 1 ? dc.body1
									: dc.body2)
									.find(">table>tbody>tr[opengrid-row-index]:last");
						case 'allbody':
							return (idNum == 1 ? dc.body1: dc.body2)
									.find(">table>tbody>tr[opengrid-row-index]");
						default:
								return null;
					}
				}
			},
			getRow : function(context, p) {
				var rowindex = (typeof p == "object") ? p
						.attr("opengrid-row-index") : p;
				return context.data[parseInt(rowindex)];
			},
			getRowIndex : function(tr) {
				return parseInt(tr.attr("opengrid-row-index"));
			}
	}
	
	var editors  = {
		text : {
			init : function(container, options) {
				var $el = $(
						"<input type=\"text\" class=\"opengrid-editable-input\">")
						.appendTo(container);
				return $el;
			},
			getValue : function(target) {
				return $(target).val();
			},
			setValue : function(target, value) {
				$(target).val(value);
			},
			resize : function(target, width) {
				$(target).outerWidth(width).outerHeight(22);
			}
		},
		textarea : {
			init : function(container, options) {
				var $el = $(
						"<textarea class=\"opengrid-editable-input\"></textarea>")
						.appendTo(container);
				return $el;
			},
			getValue : function(target) {
				return $(target).val();
			},
			setValue : function(target, value) {
				$(target).val(value);
			},
			resize : function(target, width) {
				$(target).outerWidth(width);
			}
		}
	};
	
	$.fn.opengrid.methods = {
		options : function() {
			var opts = this.options;
			var panel = this.panel.data("panel");
			var opts = $.extend(opts, {
				width : panel.width,
				height : panel.height
			});
			return opts;
		},
		deleteRow : function(rowIndex){
			logger.startTimeRecord("deleteRow");
			this.options.bodyManager.deleteRow(this,rowIndex);
			logger.stopTimeRecord("deleteRow");
		},
		insertRow : function(rowIndex,row){
			logger.startTimeRecord("insertRow");
			row = row?row:{};
			this.insertedRows.push(row);
			this.options.bodyManager.insertRow(this,rowIndex,row);
			logger.stopTimeRecord("insertRow");
		},
		cancelEdit : function(rowIndex){
			this.endEdit(rowIndex,true);
		},
		load : function(data){
			this.setData(data);
			this.renderBody();
		},
		prePage:function(){
			this.options.pagination.pre.call(this);
		},
		nextPage:function(){
			this.options.pagination.next.call(this);
		},
		firstPage:function(){
			this.options.pagination.first.call(this);
		},
		lastPage:function(){
			this.options.pagination.last.call(this);
		},
		goPage:function(page){
			this.options.pagination.goPage.call(this,page);
		}
	};
	
	$.fn.opengrid.defaults = {
		height: 'auto',
		width:'auto',
		columnOptions:{
			minWidth : 40,
			maxWidth : 1000,
			resizable : true
		},
		frozenColumns : undefined,
		columns : undefined,
		fitColumns : false,
		striped : false,
		method : "post",
		autoRowHeight : false, //是否存在列内容自动换行的，内部用，外部别去改变它值
		idField : null,
		url : null,
		data : null,
		loadMsg : "正在处理，请稍待。。。",
		emptyMsg : "没有查到数据!",
		singleSelect : true,
		selectOnCheck : true,
		checkOnSelect : true,
		pagination : {
			pageNo : 1,
			pageSize : 10,
			total : 10,
			pre:function(){
				var pagination = this.options.pagination;
				pagination.goPage.call(this,pagination.pageNo-1);
			},
			next:function(){
				var pagination = this.options.pagination;
				pagination.goPage.call(this,pagination.pageNo+1);
			},
			first:function(){
				var pagination = this.options.pagination;
				pagination.goPage.call(this,1);
			},
			last:function(){
				var pagination = this.options.pagination;
				pagination.goPage.call(this,Math.ceil(pagination.total/pagination.pageSize));
			},
			goPage:function(page){
				var pagination = this.options.pagination;
				pagination.pageNo = page;
				this.loadData();
			}
		},
		queryParams : {},
		multiSort : false,
		remoteSort : true,
		showHeader : true,
		scrollbarSize : 18,
		rowStyler : function(rowIndex, row) {
		},
		onBeforeLoad : function(queryParams) {
			var opts = this.options;
			queryParams["pagination.pageNo"] = opts.pagination.pageNo;
			queryParams["pagination.pageSize"] = opts.pagination.pageSize;
			queryParams["pagination.offset"] = opts.pagination.offset;
			queryParams["pagination.total"] = opts.pagination.total;
			queryParams["pagination.orderBy"] = opts.pagination.orderBy;
		},
		onLoadSuccess : function(data) {
			
		},
		loader : function(url,queryParams, successCallback, errorCallback) {
			var opts = this.options;
			if (!url) {
				return false;
			}
			logger.startTimeRecord("loader");
			$.ajax({
				type : opts.method,
				url : url,
				data : queryParams,
				dataType : "json",
				success : function(data) {
					logger.stopTimeRecord("loader");
					successCallback(data);
				},
				error : function(a,b) {
					logger.info("error:"+b);
					errorCallback.apply(this, arguments);
				}
			});
		},
		editors : editors,
		bodyManager : bodyManager,
		onLoadError : function() {
		},
		onClickRow : function(rowIndex, row) {
		},
		onDblClickRow : function(rowIndex, row) {
		},
		onClickCell : function( rowIndex, field, val) {
		},
		onDblClickCell : function( rowIndex, field, val) {
		},
		onSortColumn : function(sortNames, sortOrders) {
		},
		onResizeColumn : function(field,width) {
		},
		onSelect : function(rowIndex, row) {
		},
		onUnselect : function(rowIndex, row) {
		},
		onSelectAll : function(rows) {
		},
		onUnselectAll : function(rows) {
		},
		onCheck : function(rowIndex, row) {
		},
		onUncheck : function(rowIndex, row) {
		},
		onCheckAll : function(rows) {
		},
		onUncheckAll : function(rows) {
		},
		onBeforeEdit : function( rowIndex, row) {
		},
		onAfterEdit : function( rowIndex, row, newrow) {
		},
		onCancelEdit : function(rowIndex, row) {
		},
		onHeaderContextMenu : function(e, field) {
		},
		onRowContextMenu : function(e, rowIndex, row) {
		}
	};
	
})(jQuery,window,undefined);