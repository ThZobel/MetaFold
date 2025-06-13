"use strict";(this.webpackChunkJSONCrackViewer=this.webpackChunkJSONCrackViewer||[]).push([[590],{73:(e,t,n)=>{n.d(t,{c:()=>l,i:()=>i});var r=n(146);const i=e=>{var t;return"string"==typeof e&&(t=/(https?:\/\/.*\.(?:png|jpg|gif))/i.test(e),e=e.startsWith("data:image/")&&e.includes("base64"),t||e)},a=new Map,l=(setInterval((()=>a.clear()),12e4),(e,t=!1)=>{var{compactNodes:n,disableImagePreview:l}=r.u.getState(),l=i(e)&&!l,o=[e,t,n].toString();if(a.has(o)){var s=a.get(o);if(s)return s}return s=(e=>"string"==typeof e?e:e.map((([e,t])=>e+": "+JSON.stringify(t).slice(0,80))).join("\n"))(e),s=((e,t=!1)=>{var n;return e?((n=document.createElement("div")).style.whiteSpace=t?"nowrap":"pre-wrap",n.innerHTML=e,n.style.fontSize="10px",n.style.width="fit-content",n.style.height="fit-content",n.style.padding="10px",n.style.fontWeight="500",n.style.overflowWrap="break-word",n.style.fontFamily="Menlo, monospace",n.style.lineHeight="1.5",document.body.appendChild(n),e=(t=n.getBoundingClientRect()).width+4,t=t.height,document.body.removeChild(n),{width:e,height:t}):{width:45,height:45}})(s,"string"==typeof e),l&&(s.width=80,s.height=80),n&&(s.width=300),t&&n&&(s.width=170),t&&(s.width+=100),700<s.width&&(s.width=700),a.set(o,s),s})},590:(e,t,n)=>{n.r(t),n.d(t,{default:()=>w});var r=n(883),i=n(581),a=n(146),l=n(73),o=n(962);n(848),n(845);const s=()=>r.createElement("svg",{stroke:"currentColor",fill:"currentColor",strokeWidth:"0",viewBox:"0 0 24 24",height:"18px",width:"18px",xmlns:"http://www.w3.org/2000/svg"},r.createElement("path",{fill:"none",d:"M0 0h24v24H0z"}),r.createElement("path",{d:"M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"})),d=()=>r.createElement("svg",{stroke:"currentColor",fill:"currentColor",strokeWidth:"0",viewBox:"0 0 24 24",height:"18px",width:"18px",xmlns:"http://www.w3.org/2000/svg"},r.createElement("path",{fill:"none",d:"M0 0h24v24H0V0z"}),r.createElement("path",{d:"M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.43-.98 2.63-2.31 2.98l1.46 1.46C20.88 15.61 22 13.95 22 12c0-2.76-2.24-5-5-5zm-1 4h-2.19l2 2H16zM2 4.27l3.11 3.11A4.991 4.991 0 002 12c0 2.76 2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1 0-1.59 1.21-2.9 2.76-3.07L8.73 11H8v2h2.73L13 15.27V17h1.73l4.01 4L20 19.74 3.27 3 2 4.27z"}),r.createElement("path",{fill:"none",d:"M0 24V0"})),c=i.Ay.button`
  pointer-events: all;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({theme:e})=>e.TEXT_NORMAL};
  background: rgba(0, 0, 0, 0.1);
  height: 100%;
  width: 40px;
  border-left: 1px solid ${({theme:e})=>e.BACKGROUND_MODIFIER_ACCENT};

  &:hover {
    background-image: linear-gradient(rgba(0, 0, 0, 0.1) 0 0);
  }
`,h=i.Ay.span`
  display: flex;
  justify-content: ${({$hasCollapse:e})=>e?"space-between":"center"};
  align-items: center;
  height: 100%;
  width: 100%;
`,p=i.Ay.div`
  padding: 5px;
`,g=i.Ay.img`
  border-radius: 2px;
  object-fit: contain;
  background: ${({theme:e})=>e.BACKGROUND_MODIFIER_ACCENT};
`;var w=r.memo((({node:e,x:t,y:n,hasCollapse:i=!1})=>{const{id:w,text:u,width:m,height:f,data:{isParent:E,childrenCount:y,type:O}}=e;e=(0,a.u)((e=>e.hideCollapseButton));var x=(0,a.u)((e=>!e.hideChildrenCount)),v=(0,a.u)((e=>!e.disableImagePreview));const b=(0,a.u)((e=>e.expandNodes)),C=(0,a.u)((e=>e.collapseNodes)),N=(0,a.u)((e=>e.collapsedParents.includes(w)));return v=v&&(0,l.i)(u),r.createElement(o.S,{width:m,height:f,x:0,y:0},v?r.createElement(p,null,r.createElement(g,{src:u,width:"70",height:"70",loading:"lazy"})):r.createElement(h,{"data-x":t,"data-y":n,"data-key":JSON.stringify(u),$hasCollapse:E&&!e},r.createElement(o.b,{$parent:E,$type:O},r.createElement(o.T,null,JSON.stringify(u).replace(/"/g,""))),E&&0<y&&x&&r.createElement(o.c,null,"(",y,")"),E&&i&&!e&&r.createElement(c,{"aria-label":"Expand",onClick:e=>{e.stopPropagation(),(N?b:C)(w)}},N?r.createElement(d,null):r.createElement(s,null))))}),(function(e,t){return e.node.text===t.node.text&&e.node.width===t.node.width&&e.node.data.childrenCount===t.node.data.childrenCount}))},962:(e,t,n)=>{n.d(t,{S:()=>p,T:()=>E,a:()=>w,b:()=>g,c:()=>u});var r=n(883),i=n(581);const a=/(https?:\/\/|www\.)([-\w.]+\/[\p{L}\p{Emoji}\p{Emoji_Component}!#$%&'"()*+,./\\:;=_?@[\]~-]*[^\s'",.;:\b)\]}?]|(([\w-]+\.)+[\w-]+[\w/-]))/u,l=({match:e,className:t})=>r.createElement("a",{className:t,href:/^www\./.exec(e)?"http://"+e:e,target:"_blank",rel:"noreferrer"},e);let o=0;const s=()=>++o,d=/[\u0000-\u001F\u007F-\u009F\u2000-\u200D\uFEFF]/gim;function c(e,t,n){return"string"==typeof e?function(e,t,n){var i=[];let a=e;for(;(o=n.exec(a))&&void 0!==o[0];){var l=o.index,o=o.index+o[0].length,c=a.slice(0,l);l=a.slice(l,o).replace(d,""),a=a.slice(o),c&&i.push(c),i.push(t(l,s()))}return a&&i.push(r.createElement(r.Fragment,{key:s()},a)),0===i.length?e:i}(e,t,n):Array.isArray(e)?e.map((e=>c(e,t,n))):(0,r.isValidElement)(e)&&e.props.children&&"a"!==e.type&&"button"!==e.type?(0,r.cloneElement)(e,{...e.props,key:s()},c(e.props.children,t,n)):e}const h=(0,i.Ay)((e=>r.createElement(r.Fragment,null,c(e.children,((t,n)=>r.createElement(l,{key:n,match:t,className:e.className})),a))))`
  text-decoration: underline;
  pointer-events: all;
`,p=i.Ay.foreignObject`
  text-align: ${({$isObject:e})=>!e&&"center"};
  font-size: 10px;
  overflow: hidden;
  color: ${({theme:e})=>e.NODE_COLORS.TEXT};
  pointer-events: none;
  font-weight: 500;
  font-family: "Menlo", monospace;

  &.searched {
    background: rgba(27, 255, 0, 0.1);
    border: 2px solid ${({theme:e})=>e.TEXT_POSITIVE};
    border-radius: 2px;
    box-sizing: border-box;
  }

  .highlight {
    background: rgba(255, 214, 0, 0.3);
  }

  .renderVisible {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 12px;
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: pointer;
  }
`,g=i.Ay.span`
  display: inline;
  flex: 1;
  color: ${({theme:e,$type:t="null",$parent:n=!1})=>function(e,t,n){return t?"array"===n?e.NODE_COLORS.PARENT_ARR:e.NODE_COLORS.PARENT_OBJ:"object"===n?e.NODE_COLORS.NODE_KEY:e.NODE_COLORS.TEXT}(e,n,t)};
  font-size: ${({$parent:e})=>e&&"12px"};
  overflow: hidden;
  text-overflow: ellipsis;
  padding: ${({$type:e})=>"object"!==e&&"10px"};
  white-space: nowrap;
`,w=i.Ay.span`
  padding: 0 10px;
  color: ${({theme:e,$type:t})=>function(e,t){return Number.isNaN(+e)?"true"===e?t.NODE_COLORS.BOOL.TRUE:"false"===e?t.NODE_COLORS.BOOL.FALSE:"null"===e?t.NODE_COLORS.NULL:t.NODE_COLORS.NODE_VALUE:t.NODE_COLORS.INTEGER}(t,e)};
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.5;

  &:first-of-type {
    padding-top: 10px;
  }

  &:last-of-type {
    padding-bottom: 10px;
  }
`,u=i.Ay.span`
  color: ${({theme:e})=>e.NODE_COLORS.CHILD_COUNT};
  padding: 10px;
  margin-left: -15px;
`,m=i.I4.span`
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  gap: 4px;
  vertical-align: middle;
`,f=/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi,E=({children:e})=>f.test(e.replace(/"/g,""))?r.createElement(h,null,e):function(e){return/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(e)||/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.test(e)||/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0|1|0\.\d+)\s*\)$/.test(e)}(e.replace(/"/g,""))?r.createElement(m,null,e.replace(/"/g,"")):r.createElement(r.Fragment,null,e)}}]);
//# sourceMappingURL=590.jsoncrack-viewer.js.map