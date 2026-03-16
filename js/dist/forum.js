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
    if(app().forum.attribute("menuControlSticky")){
      document.body.classList.add("resofire-sticky-nav");
    }
  });

  _extend.extend(IndexPage().prototype,"onremove",function(){
    document.body.classList.remove("resofire-sticky-nav");
  });

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
    this._customIcons=app().forum.attribute("menuControlCustomIcons")||{};
    this._highlighted=app().forum.attribute("menuControlHighlighted")||[];
    var hlColor=app().forum.attribute("menuControlHighlightColor");
    if(hlColor&&hlColor.trim()){
      document.documentElement.style.setProperty("--mc-highlight-color",hlColor.trim());
    }
  });

  _extend.extend(IndexPage().prototype,"navItems",function(items){
    var self=this;
    var menuOrder=self._menuOrder;
    var menuFlip=self._menuFlip;

    var origToArray=items.toArray.bind(items);
    items.toArray=function(keepPrimitives){

      if(!labelsSynced&&app().session.user&&app().session.user.isAdmin()){
        labelsSynced=true;
        var labels={};
        var icons={};
        Object.keys(items.toObject()).forEach(function(k){
          if(isTagEntry(k))return;
          try{
            var vnode=items.get(k);
            var txt=extractText()(vnode);
            if(txt&&txt.trim())labels[k]=txt.trim();
            if(vnode&&vnode.attrs&&vnode.attrs.icon){
              icons[k]=vnode.attrs.icon;
            }
          }catch(e){}
        });
        // Build the actual rendered order from toArray() result
        // (keys in priority-sorted order, excluding tag entries)
        var renderedOrder=Object.keys(items.toObject())
          .filter(function(k){return!isTagEntry(k);});

        var body={
          "resofire-menu-control.labels":JSON.stringify(labels),
          "resofire-menu-control.icons":JSON.stringify(icons)
        };

        // Only save the order if none has been saved yet — preserves any
        // existing admin-configured order on reinstall/upgrade
        var existingOrder=app().forum.attribute("menuControlOrder");
        if(!existingOrder&&renderedOrder.length>0){
          body["resofire-menu-control.order"]=JSON.stringify(renderedOrder);
        }

        app().request({
          method:"POST",
          url:app().forum.attribute("apiUrl")+"/settings",
          body:body
        }).catch(function(){});
      }

      // Apply custom icon overrides — replace vnode.attrs.icon before render
      var customIcons=self._customIcons;
      if(customIcons){
        Object.keys(customIcons).forEach(function(key){
          if(items.has(key)){
            try{
              var vnode=items.get(key);
              if(vnode&&vnode.attrs){vnode.attrs.icon=customIcons[key];}
            }catch(e){}
          }
        });
      }

      // Set itemClassName on highlighted items so listItems() adds the CSS class to the <li>
      var highlighted=self._highlighted;
      if(highlighted&&highlighted.length>0){
        highlighted.forEach(function(key){
          if(items.has(key)){
            try{
              var vnode=items.get(key);
              if(vnode&&vnode.attrs){
                vnode.attrs.itemClassName=(vnode.attrs.itemClassName||"")+" MenuControl-highlighted";
              }
            }catch(e){}
          }
        });
      }

      if(menuOrder&&menuOrder.length>0){
        var base=menuOrder.length+200;
        menuOrder.forEach(function(key,index){
          if(items.has(key)){items.setPriority(key,base-index);}
        });
      }

      if(menuFlip){
        var allKeys=Object.keys(items.toObject());
        var navKeys=[];
        allKeys.forEach(function(k){
          if(!isTagEntry(k)&&items.getPriority(k)>0){navKeys.push(k);}
        });
        navKeys.sort(function(a,b){return items.getPriority(b)-items.getPriority(a);});
        navKeys.forEach(function(k,i){items.setPriority(k,-(201+i));});
        allKeys.forEach(function(k){
          if(k==="separator"){items.setPriority(k,0);}
          else if(isTagEntry(k)){items.setPriority(k,-items.getPriority(k));}
        });
      }

      items.toArray=origToArray;
      return origToArray(keepPrimitives);
    };
  });

});

})(),module.exports=o})();
