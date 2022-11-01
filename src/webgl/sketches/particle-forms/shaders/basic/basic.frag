#version 300 es

precision highp float;

uniform sampler2D mapDistance;
uniform sampler2D mapNormal;

in vec2 Uv;

out vec4 FragColor;

void main() {


	vec4 d = texture(mapDistance, Uv);
	vec4 n = texture(mapNormal, Uv); //* 2.0 - 1.0;

	//if(n.a < 0.0) discard;

	vec3 o = mix( vec3( 1.0, 0.0, 0.0 ), vec3( 1.0 ), d.a );

	FragColor = vec4( step( 0.0, o ), 1.0 );

	FragColor = vec4( vec3( n.rgb ), 1.0 );

}