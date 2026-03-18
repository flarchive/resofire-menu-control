(()=>{var t={n:o=>{var s=o&&o.__esModule?()=>o.default:()=>o;return t.d(s,{a:s}),s},d:(o,s)=>{for(var n in s)t.o(s,n)&&!t.o(o,n)&&Object.defineProperty(o,n,{enumerable:!0,get:s[n]})},o:(t,o)=>Object.prototype.hasOwnProperty.call(t,o),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},o={};(()=>{"use strict";t.r(o);

function g(t,o){return g=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,o){return t.__proto__=o,t},g(t,o)}
function _(t,o){t.prototype=Object.create(o.prototype),t.prototype.constructor=t,g(t,o)}

const _app=flarum.core.compat["admin/app"];var app=t.n(_app);
const _Button=flarum.core.compat["common/components/Button"];var Button=t.n(_Button);
const _Switch=flarum.core.compat["common/components/Switch"];var Switch=t.n(_Switch);
const _Stream=flarum.core.compat["common/utils/Stream"];var Stream=t.n(_Stream);
const _ExtensionPage=flarum.core.compat["components/ExtensionPage"];var ExtensionPage=t.n(_ExtensionPage);
const _saveSettings=flarum.core.compat["admin/utils/saveSettings"];var saveSettings=t.n(_saveSettings);
const _ColorPreviewInput=flarum.core.compat["common/components/ColorPreviewInput"];var ColorPreviewInput=t.n(_ColorPreviewInput);

var TAG_ENTRY_RE=/^tag\d+$/;
function isTagEntry(key){return key==="separator"||key==="moreTags"||TAG_ENTRY_RE.test(key);}

var MenuControlPage=function(Base){
  function C(){return Base.apply(this,arguments)||this}
  _(C,Base);
  var p=C.prototype;

  p.oninit=function(vnode){
    Base.prototype.oninit.call(this,vnode);
    this.loading=false;
    this.successAlert=null;
    this._labels=app().forum.attribute("menuControlNavLabels")||{};
    this._icons=app().forum.attribute("menuControlIcons")||{};
    this.orderedKeys=this._buildInitialOrder();
    this._savedOrder=this.orderedKeys.slice();

    // Flip toggle
    var rawFlip=app().data.settings["resofire-menu-control.flip"];
    this.flipNav=Stream()(rawFlip==="1"||rawFlip===true);
    this._savedFlip=this.flipNav();

    // Sticky toggle
    var rawSticky=app().data.settings["resofire-menu-control.sticky"];
    this.stickyNav=Stream()(rawSticky==="1"||rawSticky===true);
    this._savedSticky=this.stickyNav();

    // Custom icons — admin-overridden FA class strings per key
    var rawCustomIcons=app().data.settings["resofire-menu-control.custom-icons"];
    var customIconsObj={};
    try{customIconsObj=rawCustomIcons?JSON.parse(rawCustomIcons):{}}catch(e){}
    this.customIcons=Stream()(customIconsObj);
    this._savedCustomIcons=JSON.stringify(customIconsObj);

    // Custom links — admin-defined links added to the nav
    var rawCustomLinks=app().data.settings["resofire-menu-control.custom-links"];
    var customLinksArr=[];
    try{customLinksArr=rawCustomLinks?JSON.parse(rawCustomLinks):[]}catch(e){}
    this.customLinks=Stream()(customLinksArr);
    this._savedCustomLinks=JSON.stringify(customLinksArr);

    // Removed keys — items dismissed from the admin list
    var rawRemoved=app().data.settings["resofire-menu-control.removed-keys"];
    var removedArr=[];
    try{removedArr=rawRemoved?JSON.parse(rawRemoved):[]}catch(e){}
    this.removedKeys=Stream()(removedArr);
    this._savedRemovedKeys=JSON.stringify(removedArr);

    // Highlight color
    var rawHlColor=app().data.settings["resofire-menu-control.highlight-color"]||"";
    this.highlightColor=Stream()(rawHlColor);
    this._savedHighlightColor=rawHlColor;

    // Highlighted items
    var rawHighlighted=app().data.settings["resofire-menu-control.highlighted"];
    var highlightedArr=[];
    try{highlightedArr=rawHighlighted?JSON.parse(rawHighlighted):[]}catch(e){}
    this.highlighted=Stream()(highlightedArr);
    this._savedHighlighted=JSON.stringify(highlightedArr);


  };

  p._buildInitialOrder=function(){
    var phpKeys=(app().forum.attribute("menuControlNavKeys")||[])
      .filter(function(k){return!isTagEntry(k);});
    var rawOrder=app().data.settings["resofire-menu-control.order"]||null;
    var savedOrder=[];
    try{savedOrder=rawOrder?JSON.parse(rawOrder):[]}catch(e){}
    savedOrder=savedOrder.filter(function(k){return!isTagEntry(k);});
    var removed=[];
    try{removed=JSON.parse(app().data.settings["resofire-menu-control.removed-keys"]||"[]")}catch(e){}

    // Add custom link keys to phpKeys BEFORE building merged so saved order is preserved
    var customLinksRaw=app().data.settings["resofire-menu-control.custom-links"];
    var customLinkKeys=[];
    try{
      var cl=customLinksRaw?JSON.parse(customLinksRaw):[];
      cl.forEach(function(l,i){customLinkKeys.push("custom-link-"+i);});
    }catch(e){}
    customLinkKeys.forEach(function(k){if(phpKeys.indexOf(k)===-1)phpKeys.push(k);});

    var merged=savedOrder.filter(function(k){return phpKeys.indexOf(k)!==-1&&removed.indexOf(k)===-1;});
    phpKeys.forEach(function(k){if(merged.indexOf(k)===-1&&removed.indexOf(k)===-1)merged.push(k);});

    // If no saved order exists yet, apply a sensible default:
    // move 'tags' to the end since it is always last in Flarum's nav.
    // This prevents the PHP discovery order (which is alphabetical by
    // extension load order) from showing Tags second.
    if(!rawOrder){
      var tagsIdx=merged.indexOf("tags");
      if(tagsIdx!==-1&&tagsIdx!==merged.length-1){
        merged.splice(tagsIdx,1);
        merged.push("tags");
      }
    }

    return merged;
  };

  p._label=function(key){
    if(this._isCustomLink(key))return this._customLinkLabel(key);
    return this._labels[key]||key;
  };
  p._icon=function(key){return this._icons[key]||null;};

  // Returns the custom icon for key if set, otherwise the discovered icon
  p._effectiveIcon=function(key){
    if(this._isCustomLink(key)){
      var idx=this._customLinkIndex(key);
      var links=this.customLinks();
      var ci=this.customIcons();
      if(ci[key]&&ci[key].trim())return ci[key].trim();
      return links[idx]&&links[idx].icon?links[idx].icon:"fas fa-link";
    }
    var ci=this.customIcons();
    return (ci[key]&&ci[key].trim()) ? ci[key].trim() : this._icon(key);
  };
  p._setCustomIcon=function(key,val){
    var ci=Object.assign({},this.customIcons());
    if(val&&val.trim()){ci[key]=val.trim();}
    else{delete ci[key];}
    this.customIcons(ci);
  };

  p._isHighlighted=function(key){
    return this.highlighted().indexOf(key)!==-1;
  };
  p._toggleHighlighted=function(key){
    var arr=this.highlighted().slice();
    var idx=arr.indexOf(key);
    if(idx===-1)arr.push(key);
    else arr.splice(idx,1);
    this.highlighted(arr);
    m.redraw();
  };

  p._removeItem=function(key){
    // Remove from orderedKeys
    var arr=this.orderedKeys.filter(function(k){return k!==key;});
    this.orderedKeys=arr;
    // Add to removedKeys so it stays gone after reload
    var removed=this.removedKeys().slice();
    if(removed.indexOf(key)===-1)removed.push(key);
    this.removedKeys(removed);
    m.redraw();
  };

  p._addCustomLink=function(){
    var links=this.customLinks().slice();
    links.push({label:"",icon:"fas fa-link",url:"",external:false});
    this.customLinks(links);
    // Add to orderedKeys
    var key="custom-link-"+(links.length-1);
    this.orderedKeys=this.orderedKeys.concat([key]);
    m.redraw();
  };

  p._updateCustomLink=function(index,field,value){
    var links=this.customLinks().slice();
    if(!links[index])return;
    links[index]=Object.assign({},links[index]);
    links[index][field]=value;
    this.customLinks(links);
  };

  p._removeCustomLink=function(index){
    var links=this.customLinks().slice();
    links.splice(index,1);
    this.customLinks(links);
    // Remove from orderedKeys and update remaining custom-link-N keys
    var key="custom-link-"+index;
    var arr=this.orderedKeys.filter(function(k){return k!==key;});
    // Re-index remaining custom-link keys
    for(var i=index;i<links.length;i++){
      var oldKey="custom-link-"+(i+1);
      var newKey="custom-link-"+i;
      arr=arr.map(function(k){return k===oldKey?newKey:k;});
    }
    this.orderedKeys=arr;
    m.redraw();
  };

  p._isCustomLink=function(key){
    return key.indexOf("custom-link-")=== 0;
  };

  p._customLinkIndex=function(key){
    return parseInt(key.replace("custom-link-",""),10);
  };

  p._customLinkLabel=function(key){
    var idx=this._customLinkIndex(key);
    var links=this.customLinks();
    return links[idx]&&links[idx].label?links[idx].label:"Custom Link";
  };

  p.changed=function(){
    if(this.flipNav()!==this._savedFlip)return true;
    if(this.stickyNav()!==this._savedSticky)return true;
    if(JSON.stringify(this.customIcons())!==this._savedCustomIcons)return true;
    if(JSON.stringify(this.highlighted())!==this._savedHighlighted)return true;
    if(JSON.stringify(this.removedKeys())!==this._savedRemovedKeys)return true;
    if(JSON.stringify(this.customLinks())!==this._savedCustomLinks)return true;
    if(this.highlightColor()!==this._savedHighlightColor)return true;
    var a=this.orderedKeys,b=this._savedOrder;
    if(a.length!==b.length)return true;
    for(var i=0;i<a.length;i++){if(a[i]!==b[i])return true;}
    return false;
  };

  p.prepareSubmissionData=function(){
    return{
      "resofire-menu-control.order":JSON.stringify(this.orderedKeys),
      "resofire-menu-control.flip":this.flipNav()?"1":"0",
      "resofire-menu-control.sticky":this.stickyNav()?"1":"0",
      "resofire-menu-control.custom-icons":JSON.stringify(this.customIcons()),
      "resofire-menu-control.highlighted":JSON.stringify(this.highlighted()),
      "resofire-menu-control.removed-keys":JSON.stringify(this.removedKeys()),
      "resofire-menu-control.custom-links":JSON.stringify(this.customLinks()),
      "resofire-menu-control.highlight-color":this.highlightColor()
    };
  };

  p.onsubmit=function(F){
    var self=this;
    F.preventDefault();
    if(this.loading)return;
    this.loading=true;
    app().alerts.dismiss(this.successAlert);
    saveSettings()(this.prepareSubmissionData())
      .then(function(){
        self.successAlert=app().alerts.show(
          {type:"success"},
          app().translator.trans("core.admin.settings.saved_message")
        );
        self._savedOrder=self.orderedKeys.slice();
        self._savedFlip=self.flipNav();
        self._savedSticky=self.stickyNav();
        self._savedCustomIcons=JSON.stringify(self.customIcons());
        self._savedHighlighted=JSON.stringify(self.highlighted());
        self._savedRemovedKeys=JSON.stringify(self.removedKeys());
        self._savedCustomLinks=JSON.stringify(self.customLinks());
        self._savedHighlightColor=self.highlightColor();
      })
      .catch(function(){})
      .then(function(){self.loading=false;m.redraw();});
  };

  // ── Render ────────────────────────────────────────────────────────────────
  p.content=function(){
    var self=this;
    var keys=this.orderedKeys;
    return m("div",{className:"MenuControlPage"},
      m("div",{className:"container"},
        m("p",{className:"helpText"},
          app().translator.trans("resofire-menu-control.admin.nav_order.description")),
        m("form",{onsubmit:this.onsubmit.bind(this)},
          m("div",{className:"Form-group"},
            Switch().component({
              state:self.flipNav(),
              onchange:function(val){self.flipNav(val);m.redraw();}
            },app().translator.trans("resofire-menu-control.admin.nav_order.flip_label"))
          ),
          m("p",{className:"helpText",style:"margin-top:-8px;margin-bottom:16px;"},
            app().translator.trans("resofire-menu-control.admin.nav_order.flip_help")),
          m("div",{className:"Form-group"},
            Switch().component({
              state:self.stickyNav(),
              onchange:function(val){self.stickyNav(val);m.redraw();}
            },app().translator.trans("resofire-menu-control.admin.nav_order.sticky_label"))
          ),
          m("p",{className:"helpText",style:"margin-top:-8px;margin-bottom:16px;"},
            app().translator.trans("resofire-menu-control.admin.nav_order.sticky_help")),
          m("div",{className:"Form-group"},
            m("label",{className:"control-label"},
              app().translator.trans("resofire-menu-control.admin.nav_order.highlight_color_label")),
            m("p",{className:"helpText"},
              app().translator.trans("resofire-menu-control.admin.nav_order.highlight_color_help")),
            m("div",{style:"max-width:200px"},
              ColorPreviewInput().component({
                value:self.highlightColor()||"",
                placeholder:"#536F90",
                oninput:function(e){self.highlightColor(e.target.value);m.redraw();}
              })
            )
          ),
          m("div",{className:"Form-group"},
            Button().component({
              className:"Button",
              type:"button",
              icon:"fas fa-plus",
              onclick:function(e){e.preventDefault();e.stopPropagation();self._addCustomLink();}
            },app().translator.trans("resofire-menu-control.admin.nav_order.add_custom_link"))
          ),
          m("p",{className:"helpText MenuControlPage-pollsNote"},
            app().translator.trans("resofire-menu-control.admin.nav_order.polls_note")
          ),
          keys.length===0
            ?m("p",{className:"MenuControlPage-empty helpText"},
                app().translator.trans("resofire-menu-control.admin.nav_order.no_items"))
            :m("ul",{className:"MenuControlPage-list"},
                keys.map(function(key,index){return self._renderItem(key,index,keys);})),
          Button().component({
            type:"submit",
            className:"Button Button--primary",
            loading:self.loading,
            disabled:!self.changed()
          },app().translator.trans("resofire-menu-control.admin.nav_order.save_button"))
        )
      )
    );
  };

  p._renderItem=function(key,index,keys){
    var self=this;

    // Custom link items get an expanded inline editor
    if(self._isCustomLink(key)){
      var idx=self._customLinkIndex(key);
      var links=self.customLinks();
      var link=links[idx]||{label:"",icon:"fas fa-link",url:"",external:false};
      return m("li",{key:key,className:"MenuControlPage-item MenuControlPage-item--customLink"},
        m("span",{className:"MenuControlPage-icon","aria-hidden":"true"},
          m("i",{className:self._effectiveIcon(key)+" fa-fw"})),
        m("input",{
          className:"FormControl MenuControlPage-customLink-label",
          type:"text",
          placeholder:app().translator.trans("resofire-menu-control.admin.nav_order.custom_link_label"),
          value:link.label||"",
          oninput:function(e){self._updateCustomLink(idx,"label",e.target.value);}
        }),
        m("input",{
          className:"FormControl MenuControlPage-customLink-url",
          type:"text",
          placeholder:"https://",
          value:link.url||"",
          oninput:function(e){self._updateCustomLink(idx,"url",e.target.value);}
        }),
        m("input",{
          className:"FormControl MenuControlPage-iconInput",
          type:"text",
          placeholder:"fas fa-link",
          value:self.customIcons()[key]||link.icon||"",
          oninput:function(e){
            var ci=Object.assign({},self.customIcons());
            var v=e.target.value;
            if(v){ci[key]=v;}else{delete ci[key];}
            self.customIcons(ci);
          }
        }),
        m("label",{className:"MenuControlPage-customLink-external",title:app().translator.trans("resofire-menu-control.admin.nav_order.custom_link_external")},
          m("input",{type:"checkbox",checked:!!link.external,
            onchange:function(e){self._updateCustomLink(idx,"external",e.target.checked);}
          }),
          m("i",{className:"fas fa-external-link-alt"})
        ),
        m("span",{className:"MenuControlPage-arrows"},
          Button().component({
            className:"Button Button--icon Button--flat",
            icon:"fas fa-arrow-up",
            title:app().translator.trans("resofire-menu-control.admin.nav_order.move_up"),
            disabled:index===0,
            onclick:function(){self._moveUp(index);}
          }),
          Button().component({
            className:"Button Button--icon Button--flat",
            icon:"fas fa-arrow-down",
            title:app().translator.trans("resofire-menu-control.admin.nav_order.move_down"),
            disabled:index===keys.length-1,
            onclick:function(){self._moveDown(index);}
          })
        ),
        Button().component({
          className:"Button Button--icon Button--flat MenuControlPage-remove",
          icon:"fas fa-times",
          title:app().translator.trans("resofire-menu-control.admin.nav_order.remove_item"),
          onclick:function(){self._removeCustomLink(idx);}
        })
      );
    }

    var icon=self._icon(key);

    return m("li",{key:key,className:"MenuControlPage-item"},
      m("span",{className:"MenuControlPage-icon","aria-hidden":"true"},
          self._effectiveIcon(key)
            ?m("i",{className:self._effectiveIcon(key)+" fa-fw"})
            :m("i",{className:"fas fa-question fa-fw",style:"opacity:0.2"})),
      m("span",{className:"MenuControlPage-label"},self._label(key)),
      m("input",{
        className:"FormControl MenuControlPage-iconInput",
        type:"text",
        placeholder:self._icon(key)||"fas fa-...",
        value:self.customIcons()[key]||"",
        title:app().translator.trans("resofire-menu-control.admin.nav_order.icon_input_title"),
        oninput:function(e){
          // Store raw value as-is so spaces are preserved while typing
          var ci=Object.assign({},self.customIcons());
          var v=e.target.value;
          if(v){ci[key]=v;}else{delete ci[key];}
          self.customIcons(ci);
        },

      }),
      Button().component({
        className:"Button Button--icon Button--flat MenuControlPage-highlight"
          +(self._isHighlighted(key)?" is-highlighted":""),
        icon:self._isHighlighted(key)?"fas fa-star":"far fa-star",
        title:self._isHighlighted(key)
          ?app().translator.trans("resofire-menu-control.admin.nav_order.remove_highlight")
          :app().translator.trans("resofire-menu-control.admin.nav_order.add_highlight"),
        onclick:function(){self._toggleHighlighted(key);}
      }),
      Button().component({
        className:"Button Button--icon Button--flat MenuControlPage-remove",
        icon:"fas fa-times",
        title:app().translator.trans("resofire-menu-control.admin.nav_order.remove_item"),
        onclick:function(){self._removeItem(key);}
      }),
      m("span",{className:"MenuControlPage-arrows"},
        Button().component({
          className:"Button Button--icon Button--flat",
          icon:"fas fa-arrow-up",
          title:app().translator.trans("resofire-menu-control.admin.nav_order.move_up"),
          disabled:index===0,
          onclick:function(){self._moveUp(index);}
        }),
        Button().component({
          className:"Button Button--icon Button--flat",
          icon:"fas fa-arrow-down",
          title:app().translator.trans("resofire-menu-control.admin.nav_order.move_down"),
          disabled:index===keys.length-1,
          onclick:function(){self._moveDown(index);}
        })
      )
    );
  };

  p._moveUp=function(index){
    if(index===0)return;
    var arr=this.orderedKeys.slice();
    var tmp=arr[index-1];arr[index-1]=arr[index];arr[index]=tmp;
    this.orderedKeys=arr;m.redraw();
  };
  p._moveDown=function(index){
    if(index===this.orderedKeys.length-1)return;
    var arr=this.orderedKeys.slice();
    var tmp=arr[index];arr[index]=arr[index+1];arr[index+1]=tmp;
    this.orderedKeys=arr;m.redraw();
  };

  return C;
}(ExtensionPage());

app().initializers.add("resofire-menu-control",function(){
  app().extensionData.for("resofire-menu-control").registerPage(MenuControlPage);
});

})(),module.exports=o})();
