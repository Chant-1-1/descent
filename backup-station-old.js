// OLD STATION SILHOUETTE — backup
// Random scatter approach with 5 base shapes, 46 copies

const STATION_LAYERS=[
  {pts:[[-46,26],[-61,8],[-54,-11],[-19,-22],[29,-23],[61,-10],[63,8],[29,27]],col:[54,54,54],op:0.7},
  {pts:[[-24,24],[-40,2],[-27,-19],[1,-20],[26,-15],[40,4],[25,26]],col:[54,54,54],op:0.7},
  {pts:[[-110,65],[-134,35],[-146,-6],[-102,-61],[-23,-72],[98,-77],[173,-35],[170,19],[92,60],[-14,73]],col:[54,54,54],op:0.7},
  {pts:[[-16,-33],[-37,-12],[-16,52],[54,60],[15,-31],[2,-33]],col:[182,184,143],op:0.2},
  {pts:[[10,561],[-14,-560],[-11,-560],[15,560]],col:[54,54,54],op:0.7}
];
class StationSilhouette{
  constructor(){this.cx=width*0.5+random(-60,60);this.cy=height*0.45+random(-30,30);this.pieces=[];
    for(let i=0;i<46;i++){const ang=random(TWO_PI);const d=sqrt(random())*213;
      this.pieces.push({x:cos(ang)*d,y:sin(ang)*d*0.6,sc:random(0.3,1.0),rot:random(-0.4,0.4)});}
  }
  display(){push();translate(this.cx,this.cy);noStroke();
    for(let p of this.pieces){push();translate(p.x,p.y);rotate(p.rot);scale(p.sc);
      for(let l of STATION_LAYERS){fill(l.col[0],l.col[1],l.col[2],l.op*255*0.12);beginShape();for(let pt of l.pts)vertex(pt[0],pt[1]);endShape(CLOSE);}
    pop();}pop();}
}
