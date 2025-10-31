// Import Library Functions

import { CreateBoxPolygon, CreateCircle, CreateWorld, WorldStep } from '../lib/PhaserBox2D.js';
import { CreateDebugDraw, RAF } from '../lib/PhaserBox2D.js';
import { b2BodyType, b2DefaultBodyDef, b2DefaultWorldDef, b2HexColor } from '../lib/PhaserBox2D.js';
import { b2Rot, b2Vec2 } from '../lib/PhaserBox2D.js';
import { b2World_Draw } from '../lib/PhaserBox2D.js';

// ** Debug Drawing **

// set the scale at which you want the world to be drawn
const m_drawScale = 30.0;

// get the canvas element from the web page
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// create the debug drawing system
const m_draw = CreateDebugDraw(canvas, ctx, m_drawScale);

// ** Physics World Creation **

// create a definition for a world using the default values
let worldDef = b2DefaultWorldDef();

// change some of the default values
worldDef.gravity = new b2Vec2(0, -10);

// create a world object and save the ID which will access it
let world = CreateWorld({ worldDef:worldDef });

// ** Physics Object Creation **

// a box that will fall
const box = CreateBoxPolygon({
    worldId: world.worldId,
    type: b2BodyType.b2_dynamicBody,
    position: new b2Vec2(0, 10),
    size:2,
    density:1.0,
    friction:0.5,
    color:b2HexColor.b2_colorGold
});

// a ball that will fall and land on the corner of the box
const ball = CreateCircle({
    worldId: world.worldId,
    type: b2BodyType.b2_dynamicBody,
    position: new b2Vec2(1.5, 12),
    radius: 1,
    density: 1.1,
    friction: 0.5,
    color: b2HexColor.b2_colorRed
});

// a static ground which is sloped up to the right

const groundBodyDef = b2DefaultBodyDef();
groundBodyDef.rotation = new b2Rot(Math.cos(Math.PI * .03), Math.sin(Math.PI * .03));

const ground = CreateBoxPolygon({
    worldId: world.worldId,
    type: b2BodyType.b2_staticBody,
    bodyDef: groundBodyDef,
    position: new b2Vec2(0, -18),
    size: new b2Vec2(30, 1),
    density: 1.0,
    friction: 0.5,
    color: b2HexColor.b2_colorLawnGreen
});

// ** Define the RAF Update Function **
function update(deltaTime, currentTime, currentFps)
{
	// ** Step the Physics **
	WorldStep({ worldId: world.worldId, deltaTime: deltaTime });

	// ** Debug Drawing **
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	b2World_Draw(world.worldId, m_draw);
}

// ** Trigger the RAF Update Calls **
RAF(update);
