#version 300 es

precision highp float;

in vec3 Normal;
in vec4 Position;
in vec3 NormalEyeSpace;
in vec2 Uv;
in vec3 WorldPosition;

// layout(location = 0) out vec4 defaultColor;
// layout(location = 1) out vec4 scene;
// layout(location = 2) out vec4 normal;

uniform vec2 cameraPlanes;
uniform vec4 baseColor;

uniform sampler2D map;
uniform sampler2D mapDepth;

uniform float featherA;
uniform float featherB;


in vec3 ViewVector;
in vec3 Pos;

out vec4 FragColor;

void main() {

    vec3 color = texture( map, Uv ).rgb;

	float depth = texture( mapDepth, Uv ).r;

	float d = smoothstep( featherA, featherB, 1.0 - depth );

	//color.b += 0.2;
	//color.g += 0.1;

	if( Pos.z < 0.15 ) {

		//if( color.r < 0.2 ) discard;

	}

	if( Pos.y < -0.35 ) discard;

	float alpha = 0.0;
	FragColor = vec4( color, alpha );

    // scene = vec4( color, 0.0 );
	// defaultColor = scene;
    // normal = vec4(0.0);

}