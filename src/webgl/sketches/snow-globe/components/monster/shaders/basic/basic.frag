#version 300 es

precision highp float;

uniform sampler2D map;
uniform sampler2D mapDepth;

uniform float featherA;
uniform float featherB;

in vec2 Uv;
in vec3 Normal;
in vec3 ViewVector;
in vec3 Pos;

out vec4 FragColor;


void main() {

    vec3 color = texture( map, Uv ).rgb;

	float depth = texture( mapDepth, Uv ).r;

	float d = smoothstep( featherA, featherB, length( Uv - 0.5 ) - 0.5 );

	//color.b += 0.2;
	//color.g += 0.1;

	//color *= 1.5;

	if( Pos.z > 0.3 ) {

		discard;

	}

	//if( Pos.y < -0.35 ) discard;

	float dist = length( Uv - 0.5 );
	dist = 1.0 - smoothstep( 0.3, 0.5, dist );

	float distHard = 1.0 - step( 0.45, length( Uv - 0.5 ) );
	if (distHard < 1.0) discard;

	FragColor = vec4( color * dist, 1.0 );

}