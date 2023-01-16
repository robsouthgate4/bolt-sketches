#version 300 es

precision highp float;

in vec2 Uv;
in vec3 Normal;
in vec4 ShadowCoord;
in vec3 FragPosition;

in float Random;


uniform sampler2D mapSnow;
uniform float time;

out vec4 FragColor;

mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
}

#define PI 3.1415926

void main() {

    vec2 uv = gl_PointCoord.xy;
    uv.y = 1.0 - uv.y;

    uv -= 0.5;
    uv = rotate2d(Random * (PI * 2.0) + time * ( (Random + 0.5) * 1.0 )) * uv;
    uv += 0.5;

    float sdf = texture( mapSnow, uv ).r;
    if(sdf == 0.0) discard;

    vec3 color = vec3( 1.0 );

    color.rgb -= vec3( 0.1 ) * Random;

    FragColor = vec4( color, 1.0 );

}