(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

const _app=flarum.core.compat["forum/app"];var app=t.n(_app);
const _extend=flarum.core.compat["common/extend"];
const _IndexPage=flarum.core.compat["forum/components/IndexPage"];var IndexPage=t.n(_IndexPage);
const _extractText=flarum.core.compat["utils/extractText"];var extractText=t.n(_extractText);

var TAG_ENTRY_RE=/^tag\d+$/;
function isTagEntry(key){return key==="separator"||key==="moreTags"||TAG_ENTRY_RE.test(key);}

var labelsSynced=false;

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
    this._menuFlip=!!app().forum.attribute("menuControlFlip");
  });

  _extend.extend(IndexPage().prototype,"navItems",function(items){
    var self=this;
    var menuOrder=self._menuOrder;
    var menuFlip=self._menuFlip;

    var origToArray=items.toArray.bind(items);
    items.toArray=function(keepPrimitives){

      // Save real display labels (admin only, once per page load)
      if(!labelsSynced&&app().session.user&&app().session.user.isAdmin()){
        labelsSynced=true;
        var labels={};
        Object.keys(items.toObject()).forEach(function(k){
          if(isTagEntry(k))return;
          try{
            var txt=extractText()(items.get(k));
            if(txt&&txt.trim())labels[k]=txt.trim();
          }catch(e){}
        });
        app().request({
          method:"POST",
          url:app().forum.attribute("apiUrl")+"/settings",
          body:{"resofire-menu-control.labels":JSON.stringify(labels)}
        }).catch(function(){});
      }

      // Step 1: Apply saved order to nav items (always, flip or not).
      // Sets nav item priorities to base, base-1, base-2... (e.g. 206, 205, 204)
      // Non-ordered items and tag entries keep their original priorities.
      if(menuOrder&&menuOrder.length>0){
        var base=menuOrder.length+200;
        menuOrder.forEach(function(key,index){
          if(items.has(key)){items.setPriority(key,base-index);}
        });
      }

      // Step 2: If flip, move nav items to bottom while keeping their relative order.
      // Tag items (negative priorities like -14, -16) get negated to positive (+14, +16) → float to top.
      // Nav items (positive priorities 206, 205...) get mapped to negative while
      // PRESERVING their relative order: index 0 stays "first" in the nav group.
      // Separator is pinned at 0 — always sits between the two groups.
      if(menuFlip){
        var allKeys=Object.keys(items.toObject());

        // Separate nav keys (positive priority) from tag entries (negative or structural)
        var navKeys=[];
        allKeys.forEach(function(k){
          if(!isTagEntry(k)&&items.getPriority(k)>0){navKeys.push(k);}
        });

        // Sort navKeys by current priority descending (first → last)
        navKeys.sort(function(a,b){return items.getPriority(b)-items.getPriority(a);});

        // Assign negative priorities that preserve order:
        // first nav item → -(201), second → -(202), ..., last → -(200+N)
        // These are all negative so they sort below the tag items (which become positive).
        navKeys.forEach(function(k,i){
          items.setPriority(k,-(201+i));
        });

        // Negate tag entries (negative → positive, float to top)
        allKeys.forEach(function(k){
          if(k==="separator"){
            items.setPriority(k,0); // pin separator between the two groups
          } else if(isTagEntry(k)){
            items.setPriority(k,-items.getPriority(k));
          }
        });
      }

      items.toArray=origToArray;
      return origToArray(keepPrimitives);
    };
  });

});

})(),module.exports=o})();
