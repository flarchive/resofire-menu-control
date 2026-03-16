(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

const _app=flarum.core.compat["forum/app"];var app=t.n(_app);
const _extend=flarum.core.compat["common/extend"];
const _IndexPage=flarum.core.compat["forum/components/IndexPage"];var IndexPage=t.n(_IndexPage);

var TAG_ENTRY_RE=/^tag\d+$/;
function isTagEntry(key){return key==="separator"||key==="moreTags"||TAG_ENTRY_RE.test(key);}

app().initializers.add("resofire-menu-control",function(){

  _extend.extend(IndexPage().prototype,"oninit",function(){
    var rawOrder=app().forum.attribute("menuControlOrder");
    this._menuOrder=null;
    if(rawOrder){
      try{
        var parsed=JSON.parse(rawOrder);
        if(Array.isArray(parsed)&&parsed.length>0){
          this._menuOrder=parsed.filter(function(k){return!isTagEntry(k);});
        }
      }catch(e){}
    }
  });

  // Apply saved order by intercepting toArray() on the navItems ItemList.
  // At toArray() time, ALL extensions have added their items — we apply
  // priorities there, just before the sort runs inside ItemList.toArray().
  _extend.extend(IndexPage().prototype,"navItems",function(items){
    var self=this;
    var menuOrder=self._menuOrder;
    if(!menuOrder)return;

    var origToArray=items.toArray.bind(items);
    items.toArray=function(keepPrimitives){
      var base=menuOrder.length+200;
      menuOrder.forEach(function(key,index){
        if(items.has(key)){items.setPriority(key,base-index);}
      });
      items.toArray=origToArray;
      return origToArray(keepPrimitives);
    };
  });

});

})(),module.exports=o})();
