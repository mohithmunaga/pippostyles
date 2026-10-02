import{
Color as Lt,Vector2 as et,Vector3 as Ce,TextureLoader as Kn,MathUtils as tt,BufferGeometry as Jn,Float32BufferAttribute as eo,LineBasicMaterial as to,LineSegments as no,PlaneGeometry as fn,Group as mn,ShaderMaterial as pn,DoubleSide as pt,Mesh as Pt,SRGBColorSpace as hn,Scene as oo,PerspectiveCamera as ao,Raycaster as ro,WebGLRenderer as io,NoToneMapping as so,PMREMGenerator as lo,DirectionalLight as Rt,AmbientLight as co,BackSide as uo,SphereGeometry as fo,Box3 as mo,MeshStandardMaterial as po,MeshPhysicalMaterial as ho,Quaternion as vn,DynamicDrawUsage as vo,MeshBasicMaterial as go
}
from"./C64vahhe.js";
import{
R as wo,G as yo
}
from"./CY4PXAcZ.js";
import{
n as gn
}
from"./CqwBXPrO.js";
import{
c as _o
}
from"./CuRmH4_R.js";
import{
g as So,u as Mo,_ as To
}
from"./tCp9GxJk.js";
import{
_ as Rn,i as at,u as it,o as Dn,b as bo,c as rt,g as It,s as Fe,r as te,t as xo,v as Eo,x as wn,y as Co,l as Lo,e as B,z as We,j as ce,d as yn,F as Po,A as Ro,m as Dt,w as nt,B as Do,C as _n,h as q,D as Bo,E as Sn
}
from"./BAt6UgCr.js";
import{
_ as Io
}
from"./BlGwIGv3.js";
import{
u as Ao,r as Oo
}
from"./tMZp3E3_.js";
import{
p as Mn
}
from"./B0x6C0cN.js";
const Bt=new Map;
function Ho($,y={

}
){
const I=y?.timeoutMs??4500,Se=!!y?.highPriority;
if(!$)return Promise.resolve(!1);
if(Bt.has($))return Bt.get($);
const H=new Promise(C=>{
const f=new Image;
let d=!1;
const U=b=>{
d||(d=!0,C(b))
}
,M=window.setTimeout(()=>U(!1),I),ue=()=>{
if(typeof f.decode=="function"){
f.decode().then(()=>{
clearTimeout(M),U(!0)
}
).catch(()=>{
clearTimeout(M),U(!0)
}
);
return
}
clearTimeout(M),U(!0)
}
;
f.onload=ue,f.onerror=()=>{
clearTimeout(M),U(!1)
}
,f.decoding="async","fetchPriority"in f&&(f.fetchPriority=Se?"high":"low"),f.src=$,f.complete&&f.naturalWidth>0&&ue()
}
);
return Bt.set($,H),H
}
function Bn($,y={

}
){
const I=[...new Set(($??[]).filter(Boolean))];
if(!I.length)return Promise.resolve([]);
const Se=Math.max(1,Math.min(y?.concurrency??4,I.length)),H=Math.max(0,y?.highPriorityCount??0);
let C=0;
const f=Array.from({
length:Se
}
,async()=>{
for(;
C<I.length;
){
const d=C;
C+=1,await Ho(I[d],{
timeoutMs:y?.timeoutMs,highPriority:d<H
}
)
}

}
);
return Promise.allSettled(f)
}
const Tn=`
  vec3 linearToSRGB(vec3 c) {
 return pow(max(c, 0.0), vec3(1.0 / 2.2));
 
}

`,Uo=`
  varying vec3 vWorldPos;

  void main() {

    vec4 worldPos = modelMatrix * vec4(position, 1.0);

    vWorldPos = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;

  
}

`,Wo=`
  uniform float uBendH;
   // horizontal arch driven by spin velocity
  uniform float uBendV;
   // vertical arch driven by scroll velocity
  uniform float uTime;

  uniform float uPhase;
   // per-panel random phase for idle wave
  varying vec2  vUv;

  varying float vViewZ;


  void main() {

    vUv = uv;

    vec3 pos = position;


    // UV-space coords centred on 0
    float xn = (uv.x - 0.5) * 2.0;
   // -1 … +1
    float yn = (uv.y - 0.5) * 2.0;


    // Parabolic arch: 1 at centre, 0 at both edges
    float archX = 1.0 - xn * xn;

    float archY = 1.0 - yn * yn;


    pos.z -= archX * uBendH;
   // horizontal arch (spin)
    pos.z -= archY * uBendV;
   // vertical arch  (scroll)

    // Subtle idle wave — each panel has a different phase
    pos.z += sin(uv.y * 6.283 + uTime * 0.55 + uPhase)
           * sin(uv.x * 3.14  + uTime * 0.35 + uPhase * 1.3) * 0.016;


    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

    vViewZ = -mvPos.z;

    gl_Position = projectionMatrix * mvPos;

  
}

`,ke=.35,ht=12,ot=5,ko=1.2,Fo=.85,No=.72,bn=.25,xn=.15,jo=.36,zo=5e-4,Vo=.22,En=1376481,Go=10,Cn=.008,Ln=.007,V=1.1,Yo=.72,Xo=1.26,qo=.88,Pn=0,$o=760,Zo=840,Qo=980,Ko=1600,Jo=12,ea=850,ta=4,na={
__name:"ThreeCylinderScene",props:{
projects:{
type:Array,default:()=>[]
}
,spiral:{
type:Boolean,default:!1
}

}
,emits:["hover-project","open-project","focus-state-change"],setup($,{
expose:y,emit:I
}
){
let Se=null;
function H(){
return Se??=So()
}
const C=$,f=I;
at(()=>C.projects,e=>{
e?.length&&p&&(M.value=!1,xt())
}
,{
deep:!1
}
),at(()=>C.spiral,e=>{
J=e?1:0
}
);
const d=window.matchMedia("(hover: none)").matches,U=te(null),M=te(!1),ue=it("transition",()=>null),b=te(!1),Ne=te(!0),vt=`
  uniform vec3 uBaseColor;

  uniform float uSideDarken;

  uniform float uCenterLift;

  uniform float uOpacity;

  varying vec3 vWorldPos;


  ${
Tn
}


  void main() {

    vec3 dir = normalize(vWorldPos - cameraPosition);

    float side = smoothstep(0.18, 0.95, abs(dir.x));

    float lift = 1.0 + (1.0 - side) * uCenterLift;


    vec3 centerCol = uBaseColor * lift;

    vec3 sideCol   = uBaseColor * (1.0 - uSideDarken);

    vec3 col       = mix(centerCol, sideCol, side);


    gl_FragColor = vec4(linearToSRGB(col), uOpacity);

  
}

`,Me=`
  uniform sampler2D uTexture;

  uniform float     uOpacity;

  uniform float     uBlur;

  uniform float     uDepthNear;

  uniform float     uDepthFar;

  uniform vec3      uDepthColor;

  uniform float     uDepthStrength;

  varying vec2      vUv;

  varying float     vViewZ;


  ${
Tn
}


  // 9-tap box blur in UV space — cheap fake "soft" sampling for the entrance.
  vec4 sampleBlurred(sampler2D tex, vec2 uv, float blur) {

    if (blur <= 0.0005) return texture2D(tex, uv);

    vec4 acc  = texture2D(tex, uv) * 0.25;

    acc      += texture2D(tex, uv + vec2( blur, 0.0))   * 0.125;

    acc      += texture2D(tex, uv + vec2(-blur, 0.0))   * 0.125;

    acc      += texture2D(tex, uv + vec2(0.0,   blur))  * 0.125;

    acc      += texture2D(tex, uv + vec2(0.0,  -blur))  * 0.125;

    acc      += texture2D(tex, uv + vec2( blur,  blur)) * 0.0625;

    acc      += texture2D(tex, uv + vec2(-blur,  blur)) * 0.0625;

    acc      += texture2D(tex, uv + vec2( blur, -blur)) * 0.0625;

    acc      += texture2D(tex, uv + vec2(-blur, -blur)) * 0.0625;

    return acc;

  
}


  void main() {

    vec4 col = sampleBlurred(uTexture, vUv, uBlur);

    float depthT = smoothstep(uDepthNear, uDepthFar, vViewZ);

    float luma   = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));

    vec3  toned  = mix(col.rgb, vec3(luma), depthT * 0.12);

    toned        = mix(toned, uDepthColor, depthT * uDepthStrength);

    col.rgb      = linearToSRGB(toned);

    col.a    *= uOpacity;

    gl_FragColor = col;

  
}

`,je=new Lt(En);
let x,p,g,Z,Q=null,G=null,ne=null,E=null,oe=null,ae=null,de=new et,Le=0,Y=[],T=[],_=null,K=7,fe=0,J=0,ee=0,st=!1,Pe=7,ze=1,Re=0,De=0,L=0,Te=0,re=1,W=1,k=!1,X=!1,me=null,P=null,ie=new et(.5,.5),pe=new et(.5,.5),he=0,Ve=0,Be=0,Ge=0,o=!1,l=null,w=!1,F=0,be=0,Ie=0,R=0,Ae=!1,gt=null,wt=0,Oe=null,Ye=[],lt=null,ct=null;
const At=new et,Ot=new et;
let N="grid",j=0,z=1,D=null,Xe=null,Ht=1.4,Ut=1.9,qe=0;
const $e=new Ce,yt=new vn,_t=new Ce,Wt=new Ce,kt=new vn,Ft=new Ce;
let xe=[],ve=0,ge=1,we=!1,Nt=0,A=!1,jt=!1;
const zt=it("appBootContentReveal",()=>!1);
let He=null,Ze=null,Qe=null;
function ut(e,t,n){
return e>=n.left&&e<=n.right&&t>=n.top&&t<=n.bottom
}
function St(){
return document.documentElement.classList.contains("mobile-menu-open")
}
function Ke(e,t){
if(St())return!0;
if(ct||(ct=document.querySelector(".nav")),ct instanceof HTMLElement){
const s=ct.getBoundingClientRect();
if(ut(e,t,s))return!0
}
const n=document.querySelector(".nav__mobile-overlay");
if(n instanceof HTMLElement){
const s=n.getBoundingClientRect();
if(ut(e,t,s))return!0
}
const a=document.querySelector(".layout-switch");
if(a instanceof HTMLElement){
const s=a.getBoundingClientRect();
if(ut(e,t,s))return!0
}
const r=document.documentElement.classList;
if(r.contains("show--consent")||r.contains("show--preferences")){
const s=document.querySelector("#cc-main .cm, #cc-main .pm");
if(s instanceof HTMLElement){
const i=s.getBoundingClientRect();
if(ut(e,t,i))return!0
}
