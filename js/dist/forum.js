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
    console.log("[MC] oninit _menuOrder:",this._menuOrder);
  });

  // The extend/override chain problem:
  // Other extensions' navItems patches run AFTER ours in the call chain,
  // meaning they add items after our callback fires — we never see them.
  //
  // Fix: intercept toArray() on the ItemList that navItems returns.
  // toArray() is called by sidebarItems() AFTER the full extend chain completes
  // and ALL extensions have added their items. At toArray() time, the ItemList
  // is fully populated. We apply our priorities there, just before sorting.
  _extend.extend(IndexPage().prototype,"navItems",function(items){
    var self=this;
    var menuOrder=self._menuOrder;
    if(!menuOrder)return;

    // Wrap toArray() on THIS specific ItemList instance.
    // The original toArray sorts by priority — we set our priorities first,
    // then let the original sort run. Since this fires at render time (when
    // sidebarItems calls navItems().toArray()), ALL extensions have already
    // added their items to the list.
    var origToArray=items.toArray.bind(items);
    items.toArray=function(keepPrimitives){
      console.log("[MC] toArray fired — keys:",Object.keys(items.toObject()));
      var base=menuOrder.length+200;
      menuOrder.forEach(function(key,index){
        if(items.has(key)){
          items.setPriority(key,base-index);
          console.log("[MC] setPriority",key,"→",(base-index));
        }
      });
      // Restore to prevent repeated wrapping on subsequent redraws
      items.toArray=origToArray;
      return origToArray(keepPrimitives);
    };
  });

});

})(),module.exports=o})();
