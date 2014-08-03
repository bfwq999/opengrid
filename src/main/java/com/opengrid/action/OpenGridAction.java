package com.opengrid.action;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.struts2.json.JSONException;

import com.opengrid.data.Pagination;
import com.opengrid.data.User;

public class OpenGridAction {
    private Pagination pagination;
    private Map<String, String> condition = new HashMap<String, String>();
    
    public Map<String, String> getCondition() {
        return condition;
    }

    public void setCondition(Map<String, String> condition) {
        this.condition = condition;
    }

    public Pagination getPagination() {
        return pagination;
    }

    public void setPagination(Pagination pagination) {
        this.pagination = pagination;
    }

    private List<User> data;
    
    public List<User> getData() {
        return data;
    }

    public void setData(List<User> data) {
        this.data = data;
    }

    public String data1() throws JSONException{
	if(pagination == null){
	    pagination = new Pagination();
	    pagination.setPageNo(1);
	    pagination.setPageSize(10);
	}
	pagination.setTotal(100);
	int start = (pagination.getPageNo()-1)*pagination.getPageSize()+1;
	int end = pagination.getPageNo()*pagination.getPageSize()+1;
	data = new ArrayList<User>();
	for (int i = start; i < end ; i++) {
	    User d = new User();
	    d.setId("id"+i);
	    d.setName("我是个英雄"+((int)(10*Math.random()))%2);
	    d.setAddr("北京市海淀区苏州街20号院银丰大厦2号楼");
	    d.setBirth(new Date());
	    d.setAge((int)(100*Math.random()));
	    d.setAttr1("attr1"+((int)(10*Math.random()))%3);
	    d.setAttr2("attr2");
	    d.setAttr3("attr3");
	    d.setAttr4("attr4");
	    d.setAttr5("attr5");
	    d.setAttr6("attr6");
	    d.setAttr7("attr7");
	    d.setAttr8("attr8");
	    d.setAttr9("attr9");
	    d.setAttr10("attr10");
	    d.setType(((int)(10*Math.random()))%2 + "");
	    data.add(d);
	}
	return "ajax";
    }
    
    public  String children(){
	data = new ArrayList<User>();
	System.out.println("======condition.id:"+condition.get("id"));
	for (int i = 1; i < 5 ; i++) {
	    User d = new User();
	    d.setId(condition.get("id")+"-"+i);
	    d.setName("我是个英雄-子行");
	    d.setAddr("北京市海淀区苏州街20号院银丰大厦2号楼");
	    d.setBirth(new Date());
	    d.setAge((int)(100*Math.random()));
	    d.setAttr1("attr1-"+i);
	    d.setAttr2("attr2-"+i);
	    d.setAttr3("attr3-"+i);
	    d.setAttr4("attr4-"+i);
	    d.setAttr5("attr5-"+i);
	    d.setAttr6("attr6-"+i);
	    d.setAttr7("attr7-"+i);
	    d.setAttr8("attr8-"+i);
	    d.setAttr9("attr9-"+i);
	    d.setAttr10("attr10-"+i);
	    d.setType(2+"");
	    data.add(d);
	}
	return "ajax";
    }
}
