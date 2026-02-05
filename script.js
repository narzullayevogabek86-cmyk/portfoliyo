const Input = {
  keys: Array(230).fill(false),
  mouse: {
    left: false,
    right: false,
    middle: false,
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  }
};

document.addEventListener("keydown", (event) => {
  Input.keys[event.keyCode] = true;
});
document.addEventListener("keyup", (event) => {
  Input.keys[event.keyCode] = false;
});
document.addEventListener("mousedown", (event) => {
  if (event.button === 0) {
    Input.mouse.left = true;
  }
  if (event.button === 1) {
    Input.mouse.middle = true;
  }
  if (event.button === 2) {
    Input.mouse.right = true;
  }
});
document.addEventListener("mouseup", (event) => {
  if (event.button === 0) {
    Input.mouse.left = false;
  }
  if (event.button === 1) {
    Input.mouse.middle = false;
  }
  if (event.button === 2) {
    Input.mouse.right = false;
  }
});
document.addEventListener("mousemove", (event) => {
  Input.mouse.x = event.clientX;
  Input.mouse.y = event.clientY;
});
document.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.touches[0];
    if (touch) {
      Input.mouse.x = touch.clientX;
      Input.mouse.y = touch.clientY;
    }
  },
  { passive: true }
);
document.addEventListener(
  "touchmove",
  (event) => {
    const touch = event.touches[0];
    if (touch) {
      Input.mouse.x = touch.clientX;
      Input.mouse.y = touch.clientY;
    }
  },
  { passive: true }
);
//Sets up canvas
const canvas = document.createElement("canvas");
canvas.setAttribute("aria-hidden", "true");
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");
const canvasSize = {
  width: window.innerWidth,
  height: window.innerHeight
};

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasSize.width = window.innerWidth;
  canvasSize.height = window.innerHeight;
  canvas.width = canvasSize.width * dpr;
  canvas.height = canvasSize.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
//Necessary classes
var segmentCount = 0;
class Segment {
  constructor(parent, size, angle, range, stiffness) {
    segmentCount++;
    this.isSegment = true;
    this.parent = parent; //Segment which this one is connected to
    if (typeof parent.children == "object") {
      parent.children.push(this);
    }
    this.children = []; //Segments connected to this segment
    this.size = size; //Distance from parent
    this.relAngle = angle; //Angle relative to parent
    this.defAngle = angle; //Default angle relative to parent
    this.absAngle = parent.absAngle + angle; //Angle relative to x-axis
    this.range = range; //Difference between maximum and minimum angles
    this.stiffness = stiffness; //How closely it conforms to default angle
    this.updateRelative(false, true);
  }
  updateRelative(iter, flex) {
    this.relAngle =
      this.relAngle -
      2 *
      Math.PI *
      Math.floor((this.relAngle - this.defAngle) / 2 / Math.PI + 1 / 2);
    if (flex) {
      //		this.relAngle=this.range/
      //				(1+Math.exp(-4*(this.relAngle-this.defAngle)/
      //				(this.stiffness*this.range)))
      //			  -this.range/2+this.defAngle;
      this.relAngle = Math.min(
        this.defAngle + this.range / 2,
        Math.max(
          this.defAngle - this.range / 2,
          (this.relAngle - this.defAngle) / this.stiffness + this.defAngle
        )
      );
    }
    this.absAngle = this.parent.absAngle + this.relAngle;
    this.x = this.parent.x + Math.cos(this.absAngle) * this.size; //Position
    this.y = this.parent.y + Math.sin(this.absAngle) * this.size; //Position
    if (iter) {
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].updateRelative(iter, flex);
      }
    }
  }
  draw(iter) {
    ctx.beginPath();
    ctx.moveTo(this.parent.x, this.parent.y);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
    if (iter) {
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].draw(true);
      }
    }
  }
  follow(iter) {
    var x = this.parent.x;
    var y = this.parent.y;
    var dist = ((this.x - x) ** 2 + (this.y - y) ** 2) ** 0.5;
    this.x = x + this.size * (this.x - x) / dist;
    this.y = y + this.size * (this.y - y) / dist;
    this.absAngle = Math.atan2(this.y - y, this.x - x);
    this.relAngle = this.absAngle - this.parent.absAngle;
    this.updateRelative(false, true);
    //this.draw();
    if (iter) {
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].follow(true);
      }
    }
  }
}
class LimbSystem {
  constructor(end, length, speed, creature) {
    this.end = end;
    this.length = Math.max(1, length);
    this.creature = creature;
    this.speed = speed;
    creature.systems.push(this);
    this.nodes = [];
    var node = end;
    for (var i = 0; i < length; i++) {
      this.nodes.unshift(node);
      //node.stiffness=1;
      node = node.parent;
      if (!node.isSegment) {
        this.length = i + 1;
        break;
      }
    }
    this.hip = this.nodes[0].parent;
  }
  moveTo(x, y) {
    this.nodes[0].updateRelative(true, true);
    var dist = ((x - this.end.x) ** 2 + (y - this.end.y) ** 2) ** 0.5;
    var len = Math.max(0, dist - this.speed);
    for (var i = this.nodes.length - 1; i >= 0; i--) {
      var node = this.nodes[i];
      var ang = Math.atan2(node.y - y, node.x - x);
      node.x = x + len * Math.cos(ang);
      node.y = y + len * Math.sin(ang);
      x = node.x;
      y = node.y;
      len = node.size;
    }
    for (var i = 0; i < this.nodes.length; i++) {
      var node = this.nodes[i];
      node.absAngle = Math.atan2(
        node.y - node.parent.y,
        node.x - node.parent.x
      );
      node.relAngle = node.absAngle - node.parent.absAngle;
      for (var ii = 0; ii < node.children.length; ii++) {
        var childNode = node.children[ii];
        if (!this.nodes.includes(childNode)) {
          childNode.updateRelative(true, false);
        }
      }
    }
    //this.nodes[0].updateRelative(true,false)
  }
  update() {
    this.moveTo(Input.mouse.x, Input.mouse.y);
  }
}
class LegSystem extends LimbSystem {
  constructor(end, length, speed, creature) {
    super(end, length, speed, creature);
    this.goalX = end.x;
    this.goalY = end.y;
    this.step = 0; //0 stand still, 1 move forward,2 move towards foothold
    this.forwardness = 0;

    //For foot goal placement
    this.reach =
      0.9 *
      ((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2) ** 0.5;
    var relAngle =
      this.creature.absAngle -
      Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x);
    relAngle -= 2 * Math.PI * Math.floor(relAngle / 2 / Math.PI + 1 / 2);
    this.swing = -relAngle + (2 * (relAngle < 0) - 1) * Math.PI / 2;
    this.swingOffset = this.creature.absAngle - this.hip.absAngle;
    //this.swing*=(2*(relAngle>0)-1);
  }
  update(x, y) {
    this.moveTo(this.goalX, this.goalY);
    //this.nodes[0].follow(true,true)
    if (this.step == 0) {
      var dist =
        ((this.end.x - this.goalX) ** 2 + (this.end.y - this.goalY) ** 2) **
        0.5;
      if (dist > 1) {
        this.step = 1;
        //this.goalX=x;
        //this.goalY=y;
        this.goalX =
          this.hip.x +
          this.reach *
          Math.cos(this.swing + this.hip.absAngle + this.swingOffset) +
          (2 * Math.random() - 1) * this.reach / 2;
        this.goalY =
          this.hip.y +
          this.reach *
          Math.sin(this.swing + this.hip.absAngle + this.swingOffset) +
          (2 * Math.random() - 1) * this.reach / 2;
      }
    } else if (this.step == 1) {
      var theta =
        Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x) -
        this.hip.absAngle;
      var dist =
        ((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2) **
        0.5;
      var forwardness2 = dist * Math.cos(theta);
      var dF = this.forwardness - forwardness2;
      this.forwardness = forwardness2;
      if (dF * dF < 1) {
        this.step = 0;
        this.goalX = this.hip.x + (this.end.x - this.hip.x);
        this.goalY = this.hip.y + (this.end.y - this.hip.y);
      }
    }
    //	ctx.strokeStyle='blue';
    //	ctx.beginPath();
    //	ctx.moveTo(this.end.x,this.end.y);
    //	ctx.lineTo(this.hip.x+this.reach*Math.cos(this.swing+this.hip.absAngle+this.swingOffset),
    //				this.hip.y+this.reach*Math.sin(this.swing+this.hip.absAngle+this.swingOffset));
    //	ctx.stroke();
    //	ctx.strokeStyle='black';
  }
}
class Creature {
  constructor(
    x,
    y,
    angle,
    fAccel,
    fFric,
    fRes,
    fThresh,
    rAccel,
    rFric,
    rRes,
    rThresh
  ) {
    this.x = x; //Starting position
    this.y = y;
    this.absAngle = angle; //Staring angle
    this.fSpeed = 0; //Forward speed
    this.fAccel = fAccel; //Force when moving forward
    this.fFric = fFric; //Friction against forward motion
    this.fRes = fRes; //Resistance to motion
    this.fThresh = fThresh; //minimum distance to target to keep moving forward
    this.rSpeed = 0; //Rotational speed
    this.rAccel = rAccel; //Force when rotating
    this.rFric = rFric; //Friction against rotation
    this.rRes = rRes; //Resistance to rotation
    this.rThresh = rThresh; //Maximum angle difference before rotation
    this.children = [];
    this.systems = [];
  }
  follow(x, y) {
    var dist = ((this.x - x) ** 2 + (this.y - y) ** 2) ** 0.5;
    var angle = Math.atan2(y - this.y, x - this.x);
    //Update forward
    var accel = this.fAccel;
    if (this.systems.length > 0) {
      var sum = 0;
      for (var i = 0; i < this.systems.length; i++) {
        sum += this.systems[i].step == 0;
      }
      accel *= sum / this.systems.length;
    }
    this.fSpeed += accel * (dist > this.fThresh);
    this.fSpeed *= 1 - this.fRes;
    this.speed = Math.max(0, this.fSpeed - this.fFric);
    //Update rotation
    var dif = this.absAngle - angle;
    dif -= 2 * Math.PI * Math.floor(dif / (2 * Math.PI) + 1 / 2);
    if (Math.abs(dif) > this.rThresh && dist > this.fThresh) {
      this.rSpeed -= this.rAccel * (2 * (dif > 0) - 1);
    }
    this.rSpeed *= 1 - this.rRes;
    if (Math.abs(this.rSpeed) > this.rFric) {
      this.rSpeed -= this.rFric * (2 * (this.rSpeed > 0) - 1);
    } else {
      this.rSpeed = 0;
    }

    //Update position
    this.absAngle += this.rSpeed;
    this.absAngle -=
      2 * Math.PI * Math.floor(this.absAngle / (2 * Math.PI) + 1 / 2);
    this.x += this.speed * Math.cos(this.absAngle);
    this.y += this.speed * Math.sin(this.absAngle);
    this.absAngle += Math.PI;
    for (var i = 0; i < this.children.length; i++) {
      this.children[i].follow(true, true);
    }
    for (var i = 0; i < this.systems.length; i++) {
      this.systems[i].update(x, y);
    }
    this.absAngle -= Math.PI;
    this.draw(true);
  }
  draw(iter) {
    var r = 4;
    ctx.beginPath();
    ctx.arc(
      this.x,
      this.y,
      r,
      Math.PI / 4 + this.absAngle,
      7 * Math.PI / 4 + this.absAngle
    );
    ctx.moveTo(
      this.x + r * Math.cos(7 * Math.PI / 4 + this.absAngle),
      this.y + r * Math.sin(7 * Math.PI / 4 + this.absAngle)
    );
    ctx.lineTo(
      this.x + r * Math.cos(this.absAngle) * 2 ** 0.5,
      this.y + r * Math.sin(this.absAngle) * 2 ** 0.5
    );
    ctx.lineTo(
      this.x + r * Math.cos(Math.PI / 4 + this.absAngle),
      this.y + r * Math.sin(Math.PI / 4 + this.absAngle)
    );
    ctx.stroke();
    if (iter) {
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].draw(true);
      }
    }
  }
}
//Initializes and animates
var critter;
function setupSimple() {
  //(x,y,angle,fAccel,fFric,fRes,fThresh,rAccel,rFric,rRes,rThresh)
  var critter = new Creature(
    window.innerWidth / 2,
    window.innerHeight / 2,
    0,
    12,
    1,
    0.5,
    16,
    0.5,
    0.085,
    0.5,
    0.3
  );
  var node = critter;
  //(parent,size,angle,range,stiffness)
  for (var i = 0; i < 128; i++) {
    var node = new Segment(node, 8, 0, 3.14159 / 2, 1);
  }
  return critter;
}
function setupTentacle() {
  //(x,y,angle,fAccel,fFric,fRes,fThresh,rAccel,rFric,rRes,rThresh)
  critter = new Creature(
    window.innerWidth / 2,
    window.innerHeight / 2,
    0,
    12,
    1,
    0.5,
    16,
    0.5,
    0.085,
    0.5,
    0.3
  );
  var node = critter;
  //(parent,size,angle,range,stiffness)
  for (var i = 0; i < 32; i++) {
    var node = new Segment(node, 8, 0, 2, 1);
  }
  //(end,length,speed,creature)
  var tentacle = new LimbSystem(node, 32, 8, critter);
  setInterval(function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    critter.follow(canvas.width / 2, canvas.height / 2);
    ctx.beginPath();
    ctx.arc(Input.mouse.x, Input.mouse.y, 2, 0, 6.283);
    ctx.fill();
  }, 33);
}
function setupArm() {
  //(x,y,angle,fAccel,fFric,fRes,fThresh,rAccel,rFric,rRes,rThresh)
  var critter = new Creature(
    window.innerWidth / 2,
    window.innerHeight / 2,
    0,
    12,
    1,
    0.5,
    16,
    0.5,
    0.085,
    0.5,
    0.3
  );
  var node = critter;
  //(parent,size,angle,range,stiffness)
  for (var i = 0; i < 3; i++) {
    var node = new Segment(node, 80, 0, 3.1416, 1);
  }
  var tentacle = new LimbSystem(node, 3, critter);
  setInterval(function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    critter.follow(canvas.width / 2, canvas.height / 2);
  }, 33);
  ctx.beginPath();
  ctx.arc(Input.mouse.x, Input.mouse.y, 2, 0, 6.283);
  ctx.fill();
}

function setupTestSquid(size, legs) {
  //(x,y,angle,fAccel,fFric,fRes,fThresh,rAccel,rFric,rRes,rThresh)
  critter = new Creature(
    window.innerWidth / 2,
    window.innerHeight / 2,
    0,
    size * 10,
    size * 3,
    0.5,
    16,
    0.5,
    0.085,
    0.5,
    0.3
  );
  var legNum = legs;
  var jointNum = 32;
  for (var i = 0; i < legNum; i++) {
    var node = critter;
    var ang = Math.PI / 2 * (i / (legNum - 1) - 0.5);
    for (var ii = 0; ii < jointNum; ii++) {
      var node = new Segment(
        node,
        size * 64 / jointNum,
        ang * (ii == 0),
        3.1416,
        1.2
      );
    }
    //(end,length,speed,creature,dist)
    var leg = new LegSystem(node, jointNum, size * 30, critter);
  }
  return critter;
}
function setupLizard(size, legs, tail) {
  var s = size;
  //(x,y,angle,fAccel,fFric,fRes,fThresh,rAccel,rFric,rRes,rThresh)
  critter = new Creature(
    window.innerWidth / 2,
    window.innerHeight / 2,
    0,
    s * 10,
    s * 2,
    0.5,
    16,
    0.5,
    0.085,
    0.5,
    0.3
  );
  var spinal = critter;
  //(parent,size,angle,range,stiffness)
  //Neck
  for (var i = 0; i < 6; i++) {
    spinal = new Segment(spinal, s * 4, 0, 3.1415 * 2 / 3, 1.1);
    for (var ii = -1; ii <= 1; ii += 2) {
      var node = new Segment(spinal, s * 3, ii, 0.1, 2);
      for (var iii = 0; iii < 3; iii++) {
        node = new Segment(node, s * 0.1, -ii * 0.1, 0.1, 2);
      }
    }
  }
  //Torso and legs
  for (var i = 0; i < legs; i++) {
    if (i > 0) {
      //Vertebrae and ribs
      for (var ii = 0; ii < 6; ii++) {
        spinal = new Segment(spinal, s * 4, 0, 1.571, 1.5);
        for (var iii = -1; iii <= 1; iii += 2) {
          var node = new Segment(spinal, s * 3, iii * 1.571, 0.1, 1.5);
          for (var iv = 0; iv < 3; iv++) {
            node = new Segment(node, s * 3, -iii * 0.3, 0.1, 2);
          }
        }
      }
    }
    //Legs and shoulders
    for (var ii = -1; ii <= 1; ii += 2) {
      var node = new Segment(spinal, s * 12, ii * 0.785, 0, 8); //Hip
      node = new Segment(node, s * 16, -ii * 0.785, 6.28, 1); //Humerus
      node = new Segment(node, s * 16, ii * 1.571, 3.1415, 2); //Forearm
      for (
        var iii = 0;
        iii < 4;
        iii++ //fingers
      ) {
        new Segment(node, s * 4, (iii / 3 - 0.5) * 1.571, 0.1, 4);
      }
      new LegSystem(node, 3, s * 12, critter, 4);
    }
  }
  //Tail
  for (var i = 0; i < tail; i++) {
    spinal = new Segment(spinal, s * 4, 0, 3.1415 * 2 / 3, 1.1);
    for (var ii = -1; ii <= 1; ii += 2) {
      var node = new Segment(spinal, s * 3, ii, 0.1, 2);
      for (var iii = 0; iii < 3; iii++) {
        node = new Segment(node, s * 3 * (tail - i) / tail, -ii * 0.1, 0.1, 2);
      }
    }
  }
  setInterval(function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    critter.follow(Input.mouse.x, Input.mouse.y);
  }, 33);
}
// Canvas styling
const rootStyles = getComputedStyle(document.documentElement);
ctx.strokeStyle = rootStyles.getPropertyValue("--primary").trim() || "#a6ff4d";
ctx.lineWidth = 2;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
//setupSimple();//Just the very basic string
//setupTentacle();//Tentacle that reaches for mouse
//setupLizard(.5,100,128);//Literal centipede
//setupSquid(2,8);//Spidery thing
const legNum = reduceMotion ? 4 : Math.floor(1 + Math.random() * 10);
const tailSegments = reduceMotion ? 10 : Math.floor(8 + legNum * 2);
setupLizard(
  8 / Math.sqrt(legNum),
  legNum,
  tailSegments
);

function animate() {
  if (!reduceMotion) {
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    critter.follow(Input.mouse.x, Input.mouse.y);
  }
  requestAnimationFrame(animate);
}

if (reduceMotion) {
  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  critter.follow(canvasSize.width / 2, canvasSize.height / 2);
} else {
  requestAnimationFrame(animate);
}

const translations = {
  en: {
    nav_home: "Home",
    nav_expertise: "Expertise",
    nav_projects: "Projects",
    nav_process: "Process",
    nav_contact: "Contact",
    hero_eyebrow: "Frontend Systems • Motion UI • Design Systems",
    hero_title_line1: "Designing",
    hero_title_line2: "Digital Creatures",
    hero_description:
      "I craft immersive front-end experiences that feel alive, blending elegant UI with performance-focused engineering.",
    hero_cta_primary: "Start a Project",
    hero_cta_secondary: "See the Work",
    scroll_hint: "Scroll",
    stat_years: "Years UI Shipping",
    stat_interfaces: "Interfaces",
    stat_lighthouse: "Lighthouse",
    profile_status: "Og'abek Narzullayev",
    skills_title: "Technical Expertise",
    skills_subtitle:
      "From tactile interfaces to polished design systems, I ship front-end experiences that feel fast, alive, and reliable.",
    skill1_title: "Frontend Engineering",
    skill1_desc: "Design systems, modern frameworks, and pixel-perfect experiences.",
    skill2_title: "UI Architecture",
    skill2_desc: "Component libraries, design tokens, and scalable UI foundations.",
    skill3_title: "Interaction Design",
    skill3_desc: "Motion, micro-interactions, and storytelling that drive engagement.",
    skill4_title: "Performance & Accessibility",
    skill4_desc: "Fast load times, smooth runtime, and inclusive UX for every user.",
    projects_title: "Featured Projects",
    projects_subtitle:
      "Selected builds that blend cinematic UI with crisp, responsive engineering.",
    project_view: "View Live",
    project1_desc: "Informative and modern landing page for an education center.",
    project2_desc: "Clean and attractive website for a tourism farm brand.",
    project3_desc: "UI project built from a Figma design into a live website.",
    project_live: "Live",
    project_post: "Post",
    process_title: "Build Process",
    process_subtitle:
      "A clear, collaborative flow that turns bold ideas into polished UI launches.",
    process1_title: "Discover",
    process1_desc: "Align on brand, users, and UX goals. Define scope and outcomes.",
    process2_title: "Prototype",
    process2_desc: "Map flows, craft UI states, and validate with motion-first prototypes.",
    process3_title: "Ship",
    process3_desc: "Build responsive UI, optimize performance, and deliver clean handoff.",
    contact_title: "Get In Touch",
    contact_subtitle: "Tell me about your idea and I'll map out the fastest UI path to launch.",
    contact_heading: "Let's build together",
    contact_lead: "Prefer async? Send a quick brief, or connect on socials.",
    form_name_label: "Name",
    form_name_placeholder: "Your name",
    form_email_label: "Email",
    form_email_placeholder: "you@email.com",
    form_message_label: "Project Details",
    form_message_placeholder: "Tell me what you want to build...",
    form_submit: "Send Message",
    footer_rights: "All rights reserved.",
    admin_login_title: "Admin Access",
    admin_login_email_label: "Login Email",
    admin_login_password_label: "Password",
    admin_login_button: "Sign In",
    admin_panel_title: "FastDev Admin",
    admin_tab_messages: "Messages",
    admin_tab_projects: "Projects",
    admin_messages_title: "Incoming Messages",
    admin_messages_hint: "Stored in this browser only.",
    admin_messages_empty: "No messages yet.",
    admin_reply_label: "Reply",
    admin_reply_placeholder: "Type your reply...",
    admin_reply_button: "Save Reply",
    admin_message_delete: "Delete",
    admin_projects_title: "Manage Projects",
    admin_projects_hint: "Add, edit, or remove projects shown on the site.",
    admin_projects_empty: "No projects yet. Add one above.",
    admin_project_form_title: "Project Editor",
    admin_project_title_label: "Project title",
    admin_project_desc_uz_label: "Description (UZ)",
    admin_project_desc_en_label: "Description (EN)",
    admin_project_image_label: "Image URL",
    admin_project_image_file_label: "Or upload image",
    admin_project_live_label: "Live URL",
    admin_project_post_label: "Post URL (optional)",
    admin_project_tags_label: "Tags (comma separated)",
    admin_project_save_button: "Save project",
    admin_project_reset_button: "Clear",
    admin_project_hint: "If you upload a large image, the browser storage can fill up.",
    admin_project_required: "Please fill title and both descriptions.",
    admin_project_edit_button: "Edit",
    admin_project_delete_button: "Delete",
    admin_logout: "Log out",
    admin_close: "Close",
    admin_form_status_success: "Message saved. Thank you!",
    admin_login_error: "Login or password is incorrect.",
    admin_project_saved: "Project saved.",
    admin_project_deleted: "Project deleted.",
    admin_reply_saved: "Reply saved."
  },
  uz: {
    nav_home: "Bosh sahifa",
    nav_expertise: "Tajriba",
    nav_projects: "Loyihalar",
    nav_process: "Jarayon",
    nav_contact: "Aloqa",
    hero_eyebrow: "Frontend tizimlar • Motion UI • Design System",
    hero_title_line1: "Dizaynlayman",
    hero_title_line2: "Raqamli mavjudotlar",
    hero_description:
      "Men jonli tuyuladigan front-end tajribalarni yarataman, nafis UI va tez ishlaydigan muhandislikni uyg'unlashtiraman.",
    hero_cta_primary: "Loyiha boshlash",
    hero_cta_secondary: "Ishlarni ko'rish",
    scroll_hint: "Pastga",
    stat_years: "UI tajriba yillari",
    stat_interfaces: "Interfeyslar",
    stat_lighthouse: "Lighthouse",
    profile_status: "Og'abek Narzullayev",
    skills_title: "Texnik tajriba",
    skills_subtitle:
      "Taktik interfeyslardan tortib, mukammal dizayn tizimlarigacha — tez, jonli va ishonchli front-end yarataman.",
    skill1_title: "Frontend muhandislik",
    skill1_desc: "Dizayn tizimlari, zamonaviy frameworklar va pixel-perfect tajribalar.",
    skill2_title: "UI arxitektura",
    skill2_desc: "Komponent kutubxonalari, design tokenlar va kengayadigan UI asoslari.",
    skill3_title: "Interaktiv dizayn",
    skill3_desc: "Motion, mikro-interaktsiyalar va hikoyalash orqali engagement.",
    skill4_title: "Tezlik va accessibility",
    skill4_desc: "Tez yuklanish, silliq ish va hamma uchun qulay UX.",
    projects_title: "Loyihalar",
    projects_subtitle: "Kinematik UI va tezkor, moslashuvchan front-end ishlari.",
    project_view: "Ko'rish",
    project1_desc: "O'quv markazi uchun informatsion va zamonaviy landing sahifa.",
    project2_desc: "Turistik ferma uchun ko'zni tortadigan va sodda sayt dizayni.",
    project3_desc: "Figma dizaynidan real web sahifaga aylantirilgan UI loyihasi.",
    project_live: "Sayt",
    project_post: "Post",
    process_title: "Ish jarayoni",
    process_subtitle: "Aniq va hamkorlikka asoslangan jarayon: g'oyadan tayyor UIgacha.",
    process1_title: "Tahlil",
    process1_desc: "Brend, foydalanuvchi va UX maqsadlarini aniqlaymiz. Scope va natijani belgilaymiz.",
    process2_title: "Prototip",
    process2_desc: "Flow va UI holatlarini qurib, motion bilan tez tekshiramiz.",
    process3_title: "Chiqarish",
    process3_desc: "Responsive UI quramiz, performance optimizatsiya qilamiz va topshiramiz.",
    contact_title: "Bog'lanish",
    contact_subtitle: "G'oyangizni yozing, eng tez UI yo'lini chizib beraman.",
    contact_heading: "Keling, birga quramiz",
    contact_lead: "Brief qoldiring yoki ijtimoiy tarmoqlarda bog'laning.",
    form_name_label: "Ism",
    form_name_placeholder: "Ismingiz",
    form_email_label: "Email",
    form_email_placeholder: "siz@email.com",
    form_message_label: "Loyiha tafsilotlari",
    form_message_placeholder: "Nima qurmoqchisiz, qisqacha yozing...",
    form_submit: "Xabar yuborish",
    footer_rights: "Barcha huquqlar himoyalangan.",
    admin_login_title: "Admin panelga kirish",
    admin_login_email_label: "Login",
    admin_login_password_label: "Parol",
    admin_login_button: "Kirish",
    admin_panel_title: "FastDev Admin",
    admin_tab_messages: "Xabarlar",
    admin_tab_projects: "Loyihalar",
    admin_messages_title: "Kelgan xabarlar",
    admin_messages_hint: "Xabarlar shu brauzerda saqlanadi.",
    admin_messages_empty: "Hozircha xabar yo'q.",
    admin_reply_label: "Javob",
    admin_reply_placeholder: "Javobingizni yozing...",
    admin_reply_button: "Javobni saqlash",
    admin_message_delete: "O'chirish",
    admin_projects_title: "Loyihalarni boshqarish",
    admin_projects_hint: "Loyihalarni qo'shish, tahrirlash yoki o'chirish.",
    admin_projects_empty: "Loyiha yo'q. Yuqoridan qo'shing.",
    admin_project_form_title: "Loyiha tahriri",
    admin_project_title_label: "Loyiha nomi",
    admin_project_desc_uz_label: "Ta'rif (UZ)",
    admin_project_desc_en_label: "Ta'rif (EN)",
    admin_project_image_label: "Rasm URL",
    admin_project_image_file_label: "Yoki rasm yuklash",
    admin_project_live_label: "Live URL",
    admin_project_post_label: "Post URL (ixtiyoriy)",
    admin_project_tags_label: "Teglar (vergul bilan)",
    admin_project_save_button: "Saqlash",
    admin_project_reset_button: "Tozalash",
    admin_project_hint: "Katta rasm yuklansa, brauzer xotirasi to'lishi mumkin.",
    admin_project_required: "Loyiha nomi va ikki ta'rifni to'ldiring.",
    admin_project_edit_button: "Tahrirlash",
    admin_project_delete_button: "O'chirish",
    admin_logout: "Chiqish",
    admin_close: "Yopish",
    admin_form_status_success: "Xabar saqlandi. Rahmat!",
    admin_login_error: "Login yoki parol noto'g'ri.",
    admin_project_saved: "Loyiha saqlandi.",
    admin_project_deleted: "Loyiha o'chirildi.",
    admin_reply_saved: "Javob saqlandi."
  }
};

const langToggle = document.getElementById("langToggle");

function applyLanguage(lang) {
  const langPack = translations[lang] || translations.en;
  document.documentElement.lang = lang === "uz" ? "uz" : "en";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (langPack[key]) {
      el.textContent = langPack[key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (langPack[key]) {
      el.setAttribute("placeholder", langPack[key]);
    }
  });

  if (langToggle) {
    const isUz = lang === "uz";
    langToggle.textContent = isUz ? "ENG" : "UZB";
    langToggle.setAttribute(
      "aria-label",
      isUz ? "Switch to English" : "O'zbekchaga o'tkazish"
    );
  }

  localStorage.setItem("lang", lang);

  if (window.__adminReady) {
    if (typeof renderProjects === "function") {
      renderProjects();
    }
    if (typeof renderAdminProjects === "function") {
      renderAdminProjects();
    }
    if (typeof renderMessages === "function") {
      renderMessages();
    }
  }
}

const storedLang = localStorage.getItem("lang");
applyLanguage(storedLang || "en");

if (langToggle) {
  langToggle.addEventListener("click", () => {
    const nextLang = document.documentElement.lang === "uz" ? "en" : "uz";
    applyLanguage(nextLang);
  });
}

// Navigation Menu Toggle
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("navMenu");

const closeMenu = () => {
  if (!navMenu || !hamburger) {
    return;
  }
  navMenu.classList.remove("active");
  hamburger.classList.remove("is-active");
  hamburger.setAttribute("aria-expanded", "false");
};

if (hamburger && navMenu) {
  hamburger.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("active");
    hamburger.classList.toggle("is-active", isOpen);
    hamburger.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    if (navMenu && navMenu.classList.contains("active")) {
      closeMenu();
    }
  });
});

document.addEventListener("click", (event) => {
  if (!navMenu || !hamburger) {
    return;
  }
  if (!navMenu.classList.contains("active")) {
    return;
  }
  if (navMenu.contains(event.target) || hamburger.contains(event.target)) {
    return;
  }
  closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
    closeAdminModal();
    closeAdminPanel();
  }
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    const target = document.querySelector(this.getAttribute("href"));
    if (!target) {
      return;
    }
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// Section highlight
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav-link");

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      const id = entry.target.getAttribute("id");
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
      });
    });
  },
  { threshold: 0.4 }
);

sections.forEach((section) => sectionObserver.observe(section));

// Scroll animations
const revealObserver = new IntersectionObserver(
  (entries, observerInstance) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observerInstance.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

function observeRevealItems(scope = document) {
  const revealItems = scope.querySelectorAll(".reveal");
  revealItems.forEach((item) => {
    if (reduceMotion) {
      item.classList.add("is-visible");
    } else {
      revealObserver.observe(item);
    }
  });
}

observeRevealItems();

const ADMIN_EMAIL = "nogabek221@gmail.com";
const ADMIN_PASSWORD = "Ogabek0507@$";
const ADMIN_AUTH_KEY = "fastdev_admin_auth";
const MESSAGES_KEY = "fastdev_messages";
const PROJECTS_KEY = "fastdev_projects";

function getLang() {
  return document.documentElement.lang === "uz" ? "uz" : "en";
}

function t(key) {
  const lang = getLang();
  return (translations[lang] && translations[lang][key]) || translations.en[key] || "";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString();
}

function loadMessages() {
  try {
    const stored = localStorage.getItem(MESSAGES_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveMessages(messages) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

function getDefaultProjects() {
  return [
    {
      id: "project-sensorika",
      title: "Sensorika o'quv markazi",
      descUz: translations.uz.project1_desc,
      descEn: translations.en.project1_desc,
      image: "sensorika.jpg",
      live: "https://euphonious-clafoutis-19bdef.netlify.app/",
      post: "https://www.facebook.com/sensorika.education/posts/1797847253713536/",
      tags: ["HTML", "CSS", "JavaScript", "db.js"]
    },
    {
      id: "project-sarbon",
      title: "Sarbon Tour",
      descUz: translations.uz.project2_desc,
      descEn: translations.en.project2_desc,
      image: "sarbon.jpg",
      live: "https://musical-sherbet-f99243.netlify.app/",
      post: "",
      tags: ["HTML", "CSS", "JavaScript", "db.js", "Tailwind CSS"]
    },
    {
      id: "project-figma",
      title: "Figma UI/UX",
      descUz: translations.uz.project3_desc,
      descEn: translations.en.project3_desc,
      image: "figma.jpg",
      live: "https://endearing-peony-1e37ac.netlify.app",
      post: "",
      tags: ["HTML", "CSS", "JavaScript", "db.js"]
    },
    {
      id: "project-safiya",
      title: "Safiya",
      descUz: "Safiya loyihasi uchun zamonaviy va toza landing sahifa.",
      descEn: "A modern and clean landing page for the Safiya project.",
      image: "safiya.png",
      live: "https://stately-sorbet-99dc5c.netlify.app/",
      post: "",
      tags: ["HTML", "CSS", "Bootstrap"]
    },
    {
      id: "project-calculator",
      title: "Calculator",
      descUz: "Oddiy va qulay kalkulyator web ilovasi.",
      descEn: "A simple and handy calculator web app.",
      image: "calculator.png",
      live: "https://moonlit-travesseiro-d7cdb7.netlify.app/",
      post: "",
      tags: ["HTML", "CSS", "JavaScript"]
    },
    {
      id: "project-asilmedia",
      title: "Asilmedia",
      descUz: "Asilmedia brendi uchun ishlab chiqilgan web sahifa.",
      descEn: "A website built for the Asilmedia brand.",
      image: "aslmedia.png",
      live: "https://phenomenal-sherbet-9ada62.netlify.app/",
      post: "",
      tags: ["HTML", "CSS", "JavaScript", "db.js"]
    }
  ];
}

function mergeProjects(defaults, stored) {
  const merged = Array.isArray(stored) ? [...stored] : [];
  const ids = new Set(
    merged.map((project) => (project && project.id ? project.id : "")).filter(Boolean)
  );
  defaults.forEach((project) => {
    if (!project || !project.id) {
      return;
    }
    if (!ids.has(project.id)) {
      merged.push(project);
      ids.add(project.id);
    }
  });
  return merged;
}

function loadProjects() {
  try {
    const stored = localStorage.getItem(PROJECTS_KEY);
    const defaults = getDefaultProjects();
    if (!stored) {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const merged = mergeProjects(defaults, parsed);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(merged));
    return merged;
  } catch (error) {
    return getDefaultProjects();
  }
}

function saveProjects(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function renderProjects() {
  const grid = document.getElementById("projectsGrid");
  if (!grid) {
    return;
  }
  const projects = loadProjects();
  grid.innerHTML = "";

  projects.forEach((project, index) => {
    const card = document.createElement("article");
    card.className = "project-card reveal";
    card.style.setProperty("--delay", `${index * 0.1}s`);

    const imageLink = document.createElement("a");
    imageLink.className = "project-image project-image-link";
    if (project.live) {
      imageLink.href = project.live;
      imageLink.target = "_blank";
      imageLink.rel = "noopener noreferrer";
    } else {
      imageLink.href = "#";
    }

    const img = document.createElement("img");
    img.src = project.image || "favicon.svg";
    img.alt = project.title || "Project image";
    imageLink.appendChild(img);

    const overlay = document.createElement("div");
    overlay.className = "project-overlay";
    const overlayButton = document.createElement("span");
    overlayButton.className = "project-btn";
    overlayButton.textContent = t("project_view");
    overlay.appendChild(overlayButton);
    imageLink.appendChild(overlay);

    const info = document.createElement("div");
    info.className = "project-info";
    const title = document.createElement("h3");
    title.textContent = project.title || "Project";
    const desc = document.createElement("p");
    const lang = getLang();
    const descText =
      lang === "uz"
        ? project.descUz || project.descEn || project.description || ""
        : project.descEn || project.descUz || project.description || "";
    desc.textContent = descText;

    const tagWrap = document.createElement("div");
    tagWrap.className = "project-tags";
    (project.tags || []).forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "tag";
      chip.textContent = tag;
      tagWrap.appendChild(chip);
    });

    const links = document.createElement("div");
    links.className = "project-links";
    if (project.live) {
      const liveLink = document.createElement("a");
      liveLink.className = "project-link";
      liveLink.href = project.live;
      liveLink.target = "_blank";
      liveLink.rel = "noopener noreferrer";
      liveLink.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> <span>${t("project_live")}</span>`;
      links.appendChild(liveLink);
    }
    if (project.post) {
      const postLink = document.createElement("a");
      postLink.className = "project-link";
      postLink.href = project.post;
      postLink.target = "_blank";
      postLink.rel = "noopener noreferrer";
      postLink.innerHTML = `<i class="fa-brands fa-facebook"></i> <span>${t("project_post")}</span>`;
      links.appendChild(postLink);
    }

    info.appendChild(title);
    info.appendChild(desc);
    if ((project.tags || []).length) {
      info.appendChild(tagWrap);
    }
    if (links.children.length) {
      info.appendChild(links);
    }

    card.appendChild(imageLink);
    card.appendChild(info);
    grid.appendChild(card);
  });

  observeRevealItems(grid);
}

function renderMessages() {
  const list = document.getElementById("adminMessagesList");
  if (!list) {
    return;
  }
  const messages = loadMessages();
  list.innerHTML = "";

  if (!messages.length) {
    list.innerHTML = "";
    return;
  }

  messages.forEach((msg) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.dataset.id = msg.id;

    const head = document.createElement("div");
    head.className = "admin-card-head";

    const headLeft = document.createElement("div");
    const name = document.createElement("div");
    name.textContent = msg.name || "Anonymous";
    const meta = document.createElement("div");
    meta.className = "admin-message-meta";
    meta.textContent = `${msg.email || "-"} • ${formatDate(msg.createdAt)}`;
    headLeft.appendChild(name);
    headLeft.appendChild(meta);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "admin-link";
    deleteBtn.dataset.action = "delete-message";
    deleteBtn.dataset.id = msg.id;
    deleteBtn.textContent = t("admin_message_delete");

    head.appendChild(headLeft);
    head.appendChild(deleteBtn);

    const messageText = document.createElement("p");
    messageText.className = "admin-message-text";
    messageText.textContent = msg.message || "";

    const repliesWrap = document.createElement("div");
    repliesWrap.className = "admin-replies";
    (msg.replies || []).forEach((reply) => {
      const replyCard = document.createElement("div");
      replyCard.className = "admin-reply";
      replyCard.textContent = reply.text;
      const replyMeta = document.createElement("div");
      replyMeta.className = "admin-reply-meta";
      replyMeta.textContent = formatDate(reply.createdAt);
      replyCard.appendChild(replyMeta);
      repliesWrap.appendChild(replyCard);
    });

    const replyForm = document.createElement("form");
    replyForm.className = "admin-reply-form";
    replyForm.dataset.replyForm = "true";
    replyForm.dataset.id = msg.id;

    const replyLabel = document.createElement("label");
    const replySpan = document.createElement("span");
    replySpan.textContent = t("admin_reply_label");
    const replyInput = document.createElement("textarea");
    replyInput.required = true;
    replyInput.placeholder = t("admin_reply_placeholder");
    replyLabel.appendChild(replySpan);
    replyLabel.appendChild(replyInput);

    const replyActions = document.createElement("div");
    replyActions.className = "admin-form-actions";
    const replyButton = document.createElement("button");
    replyButton.type = "submit";
    replyButton.className = "cta-button small";
    replyButton.textContent = t("admin_reply_button");
    const replyStatus = document.createElement("p");
    replyStatus.className = "admin-status";
    replyStatus.dataset.status = "true";
    replyActions.appendChild(replyButton);
    replyActions.appendChild(replyStatus);

    replyForm.appendChild(replyLabel);
    replyForm.appendChild(replyActions);

    card.appendChild(head);
    card.appendChild(messageText);
    if ((msg.replies || []).length) {
      card.appendChild(repliesWrap);
    }
    card.appendChild(replyForm);

    list.appendChild(card);
  });
}

function renderAdminProjects() {
  const list = document.getElementById("adminProjectsList");
  if (!list) {
    return;
  }
  const projects = loadProjects();
  list.innerHTML = "";

  if (!projects.length) {
    const empty = document.createElement("p");
    empty.className = "admin-empty";
    empty.textContent = t("admin_projects_empty");
    list.appendChild(empty);
    return;
  }

  projects.forEach((project) => {
    const card = document.createElement("div");
    card.className = "admin-project-card";
    card.dataset.id = project.id;

    const img = document.createElement("img");
    img.src = project.image || "favicon.svg";
    img.alt = project.title || "Project image";

    const body = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = project.title || "Project";
    const desc = document.createElement("p");
    const lang = getLang();
    desc.textContent =
      lang === "uz"
        ? project.descUz || project.descEn || project.description || ""
        : project.descEn || project.descUz || project.description || "";
    desc.className = "admin-message-text";

    const meta = document.createElement("div");
    meta.className = "admin-pill";
    meta.textContent = (project.tags || []).join(", ");

    const actions = document.createElement("div");
    actions.className = "admin-project-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost-button";
    editBtn.dataset.action = "edit-project";
    editBtn.dataset.id = project.id;
    editBtn.textContent = t("admin_project_edit_button");
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost-button";
    deleteBtn.dataset.action = "delete-project";
    deleteBtn.dataset.id = project.id;
    deleteBtn.textContent = t("admin_project_delete_button");
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    body.appendChild(title);
    body.appendChild(desc);
    if ((project.tags || []).length) {
      body.appendChild(meta);
    }
    body.appendChild(actions);

    card.appendChild(img);
    card.appendChild(body);
    list.appendChild(card);
  });
}

function isAdminAuthed() {
  return localStorage.getItem(ADMIN_AUTH_KEY) === "true";
}

function setAdminAuthed(value) {
  localStorage.setItem(ADMIN_AUTH_KEY, value ? "true" : "false");
}

const adminTrigger = document.getElementById("adminTrigger");
const adminLoginModal = document.getElementById("adminLoginModal");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginEmail = document.getElementById("adminLoginEmail");
const adminLoginPassword = document.getElementById("adminLoginPassword");
const adminLoginError = document.getElementById("adminLoginError");
const adminPanel = document.getElementById("adminPanel");
const adminLogout = document.getElementById("adminLogout");
const adminClose = document.getElementById("adminClose");
const adminTabs = document.querySelectorAll(".admin-tab");
const adminMessagesList = document.getElementById("adminMessagesList");
const adminProjectForm = document.getElementById("adminProjectForm");
const adminProjectId = document.getElementById("adminProjectId");
const adminProjectTitle = document.getElementById("adminProjectTitle");
const adminProjectDescUz = document.getElementById("adminProjectDescUz");
const adminProjectDescEn = document.getElementById("adminProjectDescEn");
const adminProjectImage = document.getElementById("adminProjectImage");
const adminProjectImageFile = document.getElementById("adminProjectImageFile");
const adminProjectLive = document.getElementById("adminProjectLive");
const adminProjectPost = document.getElementById("adminProjectPost");
const adminProjectTags = document.getElementById("adminProjectTags");
const adminProjectReset = document.getElementById("adminProjectReset");
const adminProjectStatus = document.getElementById("adminProjectStatus");
const adminProjectsList = document.getElementById("adminProjectsList");

function updateBodyLock() {
  const isOpen =
    (adminLoginModal && adminLoginModal.classList.contains("is-open")) ||
    (adminPanel && adminPanel.classList.contains("is-open"));
  document.body.classList.toggle("admin-open", isOpen);
}

function openAdminModal() {
  if (!adminLoginModal) {
    return;
  }
  adminLoginModal.classList.add("is-open");
  adminLoginModal.setAttribute("aria-hidden", "false");
  if (adminLoginError) {
    adminLoginError.textContent = "";
  }
  if (adminLoginForm) {
    adminLoginForm.reset();
  }
  updateBodyLock();
}

function closeAdminModal() {
  if (!adminLoginModal) {
    return;
  }
  adminLoginModal.classList.remove("is-open");
  adminLoginModal.setAttribute("aria-hidden", "true");
  updateBodyLock();
}

function openAdminPanel() {
  if (!adminPanel) {
    return;
  }
  adminPanel.classList.add("is-open");
  adminPanel.setAttribute("aria-hidden", "false");
  renderMessages();
  renderAdminProjects();
  updateBodyLock();
}

function closeAdminPanel() {
  if (!adminPanel) {
    return;
  }
  adminPanel.classList.remove("is-open");
  adminPanel.setAttribute("aria-hidden", "true");
  updateBodyLock();
}

function openAdminGate() {
  if (isAdminAuthed()) {
    openAdminPanel();
  } else {
    openAdminModal();
  }
}

function resetProjectForm(clearStatus = true) {
  if (!adminProjectForm) {
    return;
  }
  adminProjectForm.reset();
  if (adminProjectId) {
    adminProjectId.value = "";
  }
  if (adminProjectImageFile) {
    adminProjectImageFile.value = "";
  }
  if (clearStatus && adminProjectStatus) {
    adminProjectStatus.textContent = "";
    adminProjectStatus.classList.remove("is-error");
  }
}

if (adminTrigger) {
  adminTrigger.addEventListener("dblclick", (event) => {
    event.preventDefault();
    openAdminGate();
  });
}

if (adminLoginModal) {
  adminLoginModal.addEventListener("click", (event) => {
    if (event.target && event.target.matches("[data-admin-close]")) {
      closeAdminModal();
    }
  });
}

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = adminLoginEmail ? adminLoginEmail.value.trim() : "";
    const password = adminLoginPassword ? adminLoginPassword.value.trim() : "";
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setAdminAuthed(true);
      closeAdminModal();
      openAdminPanel();
    } else if (adminLoginError) {
      adminLoginError.textContent = t("admin_login_error");
    }
  });
}

if (adminLogout) {
  adminLogout.addEventListener("click", () => {
    setAdminAuthed(false);
    closeAdminPanel();
  });
}

if (adminClose) {
  adminClose.addEventListener("click", () => {
    closeAdminPanel();
  });
}

if (adminTabs.length) {
  adminTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-admin-tab");
      adminTabs.forEach((btn) => btn.classList.remove("is-active"));
      tab.classList.add("is-active");
      document.querySelectorAll(".admin-tab-content").forEach((content) => {
        content.classList.toggle("is-active", content.id === `adminTab${target.charAt(0).toUpperCase()}${target.slice(1)}`);
      });
    });
  });
}

if (adminMessagesList) {
  adminMessagesList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    if (button.dataset.action === "delete-message") {
      const id = button.dataset.id;
      const messages = loadMessages().filter((msg) => msg.id !== id);
      saveMessages(messages);
      renderMessages();
    }
  });

  adminMessagesList.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-reply-form]");
    if (!form) {
      return;
    }
    event.preventDefault();
    const id = form.dataset.id;
    const textarea = form.querySelector("textarea");
    const text = textarea ? textarea.value.trim() : "";
    if (!text) {
      return;
    }
    const messages = loadMessages();
    const targetMessage = messages.find((msg) => msg.id === id);
    if (!targetMessage) {
      return;
    }
    if (!Array.isArray(targetMessage.replies)) {
      targetMessage.replies = [];
    }
    targetMessage.replies.unshift({
      id: `reply-${Date.now()}`,
      text,
      createdAt: new Date().toISOString()
    });
    saveMessages(messages);
    renderMessages();
  });
}

if (adminProjectImageFile && adminProjectImage) {
  adminProjectImageFile.addEventListener("change", () => {
    const file = adminProjectImageFile.files && adminProjectImageFile.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      adminProjectImage.value = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

if (adminProjectForm) {
  adminProjectForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const projects = loadProjects();
    const projectIdValue = adminProjectId && adminProjectId.value ? adminProjectId.value : "";
    const payload = {
      id: projectIdValue || `project-${Date.now()}`,
      title: adminProjectTitle ? adminProjectTitle.value.trim() : "",
      descUz: adminProjectDescUz ? adminProjectDescUz.value.trim() : "",
      descEn: adminProjectDescEn ? adminProjectDescEn.value.trim() : "",
      image: adminProjectImage ? adminProjectImage.value.trim() : "",
      live: adminProjectLive ? adminProjectLive.value.trim() : "",
      post: adminProjectPost ? adminProjectPost.value.trim() : "",
      tags: adminProjectTags
        ? adminProjectTags.value.split(",").map((tag) => tag.trim()).filter(Boolean)
        : []
    };
    if (!payload.title || !payload.descUz || !payload.descEn) {
      if (adminProjectStatus) {
        adminProjectStatus.textContent = t("admin_project_required");
        adminProjectStatus.classList.add("is-error");
      }
      return;
    }
    const existingIndex = projects.findIndex((item) => item.id === payload.id);
    if (existingIndex > -1) {
      projects[existingIndex] = payload;
    } else {
      projects.unshift(payload);
    }
    saveProjects(projects);
    renderProjects();
    renderAdminProjects();
    if (adminProjectStatus) {
      adminProjectStatus.textContent = t("admin_project_saved");
      adminProjectStatus.classList.remove("is-error");
    }
    resetProjectForm(false);
  });
}

if (adminProjectReset) {
  adminProjectReset.addEventListener("click", () => {
    resetProjectForm();
  });
}

if (adminProjectsList) {
  adminProjectsList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    const id = button.dataset.id;
    if (button.dataset.action === "edit-project") {
      const projects = loadProjects();
      const project = projects.find((item) => item.id === id);
      if (!project) {
        return;
      }
      if (adminProjectId) {
        adminProjectId.value = project.id;
      }
      if (adminProjectTitle) {
        adminProjectTitle.value = project.title || "";
      }
      if (adminProjectDescUz) {
        adminProjectDescUz.value = project.descUz || "";
      }
      if (adminProjectDescEn) {
        adminProjectDescEn.value = project.descEn || "";
      }
      if (adminProjectImage) {
        adminProjectImage.value = project.image || "";
      }
      if (adminProjectLive) {
        adminProjectLive.value = project.live || "";
      }
      if (adminProjectPost) {
        adminProjectPost.value = project.post || "";
      }
      if (adminProjectTags) {
        adminProjectTags.value = (project.tags || []).join(", ");
      }
      if (adminProjectStatus) {
        adminProjectStatus.textContent = "";
        adminProjectStatus.classList.remove("is-error");
      }
      if (adminProjectForm) {
        adminProjectForm.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    if (button.dataset.action === "delete-project") {
      const projects = loadProjects().filter((item) => item.id !== id);
      saveProjects(projects);
      renderProjects();
      renderAdminProjects();
      if (adminProjectStatus) {
        adminProjectStatus.textContent = t("admin_project_deleted");
        adminProjectStatus.classList.remove("is-error");
      }
    }
  });
}

const contactForm = document.getElementById("contactForm");
const contactName = document.getElementById("contactName");
const contactEmail = document.getElementById("contactEmail");
const contactMessage = document.getElementById("contactMessage");
const contactStatus = document.getElementById("contactStatus");

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = {
      id: `msg-${Date.now()}`,
      name: contactName ? contactName.value.trim() : "",
      email: contactEmail ? contactEmail.value.trim() : "",
      message: contactMessage ? contactMessage.value.trim() : "",
      createdAt: new Date().toISOString(),
      replies: []
    };
    const messages = loadMessages();
    messages.unshift(payload);
    saveMessages(messages);
    if (contactStatus) {
      contactStatus.textContent = t("admin_form_status_success");
      contactStatus.classList.remove("is-error");
    }
    contactForm.reset();
    renderMessages();
  });
}

window.__adminReady = true;
renderProjects();
renderAdminProjects();
renderMessages();
