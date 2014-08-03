<%@ page language="java" import="java.util.*" pageEncoding="UTF-8"%>
<%
String path = request.getContextPath();
String basePath = request.getScheme()+"://"+request.getServerName()+":"+request.getServerPort()+path+"/";
%>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
  <head>
    <base href="<%=basePath%>">
    
    <title>My JSP 'index.jsp' starting page</title>
	<meta http-equiv="pragma" content="no-cache">
	<meta http-equiv="cache-control" content="no-cache">
	<meta http-equiv="expires" content="0">    
	<meta http-equiv="keywords" content="keyword1,keyword2,keyword3">
	<meta http-equiv="description" content="This is my page">
	<!--
	<link rel="stylesheet" type="text/css" href="styles.css">
	-->
  </head>
  
  <body>
    1. <a href="demo/opengrid.html" >基本的</a><br/><br/>
    2. <a href="demo/opengrid-complex.html" >复杂的</a><br/><br/>
    3. <a href="demo/opengrid-frozen.html" >冻结列</a><br/><br/>
    4. <a href="demo/opengrid-subgrid.html" >子行</a><br/><br/>
    5. <a href="demo/opengrid-group.html" >分组</a><br/><br/>
  </body>
</html>
