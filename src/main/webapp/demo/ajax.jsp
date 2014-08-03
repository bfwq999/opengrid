<%@page import="com.opengrid.data.Pagination"%>
<%@page import="org.apache.struts2.json.JSONWriter"%>
<%@ page language="java" import="java.util.*" pageEncoding="UTF-8"%>
<%
    JSONWriter jWrite = new JSONWriter();
	List data = (List)request.getAttribute("data");
	Pagination pagination = (Pagination)request.getAttribute("pagination");
	
	StringBuffer json = new StringBuffer("{");
	json.append("\"pagination\":"+jWrite.write(pagination));
	json.append(",\"data\":"+jWrite.write(data));
	json.append("}");
	System.out.print(json);
	out.print(json);
%>