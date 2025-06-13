"use strict";(this.webpackChunkJSONCrackViewer=this.webpackChunkJSONCrackViewer||[]).push([[346],{346:(e,t,n)=>{n.r(t),n.d(t,{default:()=>l});var r=n(883),a=n(962);const i=({row:e,x:t,y:n,index:i})=>{var[l,s]=e,l=JSON.stringify(l).replace(/"/g,""),o=JSON.stringify(s),s=JSON.stringify(s);return e=JSON.stringify(e),r.createElement(a.a,{"data-x":t,"data-y":n+17.8*i,"data-key":e,$type:s},r.createElement(a.b,{$type:"object"},l,": "),r.createElement(a.T,null,o))};var l=r.memo((({node:e,x:t,y:n})=>r.createElement(a.S,{width:e.width,height:e.height,x:0,y:0,$isObject:!0},e.text.map(((e,a)=>r.createElement(i,{row:e,index:a,x:t,y:n,key:a}))))),(function(e,t){return String(e.node.text)===String(t.node.text)&&e.node.width===t.node.width}))},962:(e,t,n)=>{n.d(t,{S:()=>h,T:()=>E,a:()=>O,b:()=>w,c:()=>g});var r=n(883),a=n(581);const i=/(https?:\/\/|www\.)([-\w.]+\/[\p{L}\p{Emoji}\p{Emoji_Component}!#$%&'"()*+,./\\:;=_?@[\]~-]*[^\s'",.;:\b)\]}?]|(([\w-]+\.)+[\w-]+[\w/-]))/u,l=({match:e,className:t})=>r.createElement("a",{className:t,href:/^www\./.exec(e)?"http://"+e:e,target:"_blank",rel:"noreferrer"},e);let s=0;const o=()=>++s,p=/[\u0000-\u001F\u007F-\u009F\u2000-\u200D\uFEFF]/gim;function c(e,t,n){return"string"==typeof e?function(e,t,n){var a=[];let i=e;for(;(s=n.exec(i))&&void 0!==s[0];){var l=s.index,s=s.index+s[0].length,c=i.slice(0,l);l=i.slice(l,s).replace(p,""),i=i.slice(s),c&&a.push(c),a.push(t(l,o()))}return i&&a.push(r.createElement(r.Fragment,{key:o()},i)),0===a.length?e:a}(e,t,n):Array.isArray(e)?e.map((e=>c(e,t,n))):(0,r.isValidElement)(e)&&e.props.children&&"a"!==e.type&&"button"!==e.type?(0,r.cloneElement)(e,{...e.props,key:o()},c(e.props.children,t,n)):e}const d=(0,a.Ay)((e=>r.createElement(r.Fragment,null,c(e.children,((t,n)=>r.createElement(l,{key:n,match:t,className:e.className})),i))))`
  text-decoration: underline;
  pointer-events: all;
`,h=a.Ay.foreignObject`
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
`,w=a.Ay.span`
  display: inline;
  flex: 1;
  color: ${({theme:e,$type:t="null",$parent:n=!1})=>function(e,t,n){return t?"array"===n?e.NODE_COLORS.PARENT_ARR:e.NODE_COLORS.PARENT_OBJ:"object"===n?e.NODE_COLORS.NODE_KEY:e.NODE_COLORS.TEXT}(e,n,t)};
  font-size: ${({$parent:e})=>e&&"12px"};
  overflow: hidden;
  text-overflow: ellipsis;
  padding: ${({$type:e})=>"object"!==e&&"10px"};
  white-space: nowrap;
`,O=a.Ay.span`
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
`,g=a.Ay.span`
  color: ${({theme:e})=>e.NODE_COLORS.CHILD_COUNT};
  padding: 10px;
  margin-left: -15px;
`,u=a.I4.span`
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  gap: 4px;
  vertical-align: middle;
`,m=/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi,E=({children:e})=>m.test(e.replace(/"/g,""))?r.createElement(d,null,e):function(e){return/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(e)||/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.test(e)||/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0|1|0\.\d+)\s*\)$/.test(e)}(e.replace(/"/g,""))?r.createElement(u,null,e.replace(/"/g,"")):r.createElement(r.Fragment,null,e)}}]);
//# sourceMappingURL=346.jsoncrack-viewer.js.map