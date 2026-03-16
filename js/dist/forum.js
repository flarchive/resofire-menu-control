(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

const _app=flarum.core.compat["forum/app"];var app=t.n(_app);
const _extend=flarum.core.compat["common/extend"];
const _IndexPage=flarum.core.compat["forum/components/IndexPage"];var IndexPage=t.n(_IndexPage);

var TAG_ENTRY_RE=/^tag\d+$/;
function isTagEntry(key){return key==="separator"||key==="moreTags"||TAG_ENTRY_RE.test(key);}

app().initializers.add("resofire-menu-control",function(){
  console.log("[MenuControl] initializer running");

  _extend.extend(IndexPage().prototype,"oninit",function(){
    var rawOrder=app().forum.attribute("menuControlOrder");
    console.log("[MenuControl] oninit — menuControlOrder raw:", rawOrder);
    this._menuOrder=null;
    if(rawOrder){
      try{
        var parsed=JSON.parse(rawOrder);
        if(Array.isArray(parsed)&&parsed.length>0){
          this._menuOrder=parsed.filter(function(k){return!isTagEntry(k);});
        }
      }catch(e){console.error("[MenuControl] JSON.parse error:",e);}
    }
    console.log("[MenuControl] oninit — _menuOrder:", this._menuOrder);
  });

  _extend.extend(IndexPage().prototype,"navItems",function(items){
    var allKeys=Object.keys(items.toObject());
    console.log("[MenuControl] navItems — all item keys:", allKeys);
    console.log("[MenuControl] navItems — _menuOrder:", this._menuOrder);

    var menuOrder=this._menuOrder;
    if(!menuOrder){
      console.log("[MenuControl] navItems — no order saved, skipping");
      return;
    }
    var base=menuOrder.length+200;
    menuOrder.forEach(function(key,index){
      if(items.has(key)){
        items.setPriority(key,base-index);
        console.log("[MenuControl] setPriority",key,"→",(base-index));
      } else {
        console.log("[MenuControl] key not found in items:",key);
      }
    });
  });

});

})(),module.exports=o})();
