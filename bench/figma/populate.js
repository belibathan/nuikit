// Modes, in order: Default, Neon Pop, Flat, Square (the "yours" pair: Graphite). Row order in data-*.json is mode order; the collections' modes must be named and ordered to match (docs/design/figma.md).
// Paste into a use_figma script together with a rows array from out/data-*.json: `await populate(collection, rows)`.
// Creates or updates variables by name, sets scopes, descriptions, WEB code syntax and per-mode values; returns aliases to resolve.
const SCOPES={F:["FRAME_FILL","SHAPE_FILL"],T:["TEXT_FILL"],S:["STROKE_COLOR"],A:["ALL_FILLS","STROKE_COLOR","EFFECT_COLOR"],L:["WIDTH_HEIGHT","GAP"],R:["CORNER_RADIUS"],Z:["FONT_SIZE"],K:["LETTER_SPACING"],P:["FONT_FAMILY"],Y:["FONT_STYLE"],H:[],W:["STROKE_FLOAT"],O:["OPACITY"],E:["EFFECT_COLOR"],G:["EFFECT_FLOAT"],N:["GAP"]};
const TYPES={C:"COLOR",F:"FLOAT",S:"STRING"};
function hexToRgba(h){return{r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255,a:parseInt(h.slice(7,9),16)/255}}
async function populate(collection, rows){
  const modeIds=collection.modes.map(m=>m.modeId);
  const existing=await Promise.all(collection.variableIds.map(id=>figma.variables.getVariableByIdAsync(id)));
  const byName=new Map(existing.map(v=>[v.name,v]));
  const ids={}; const pendingAlias=[];
  for(const [name,t,sc,code,desc,val] of rows){
    let v=byName.get(name);
    if(!v){v=figma.variables.createVariable(name,collection,TYPES[t]);}
    v.scopes=SCOPES[sc]; v.description=desc;
    if(code) v.setVariableCodeSyntax("WEB",code);
    if(Array.isArray(val)){
      val.forEach((x,i)=>{ if(i<modeIds.length) v.setValueForMode(modeIds[i], t==="C"?hexToRgba(x):x); });
    } else pendingAlias.push([v,val.a]);
    ids[name]=v.id;
  }
  return {ids,pendingAlias};
}
