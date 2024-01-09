// Pcx - Point cloud importer & renderer for Unity
// https://github.com/keijiro/Pcx

#include "UnityCG.cginc"
#include "Common.cginc"

// Uniforms
half4 _Tint;
half _PointSize;
float4x4 _Transform;

#if _COMPUTE_BUFFER
StructuredBuffer<float4> _PointBuffer;
#endif

// Vertex input attributes
struct Attributes
{
#if _COMPUTE_BUFFER
    uint vertexID : SV_VertexID;
#else
    float4 position : POSITION;
    half3 color : COLOR;
#endif
};

// Fragment varyings
struct Varyings
{
    float4 position : SV_POSITION;
#if !PCX_SHADOW_CASTER
    half3 color : COLOR;
    UNITY_FOG_COORDS(0)
#endif
};

// Vertex phase
Varyings Vertex(Attributes input)
{
    // Retrieve vertex attributes.
#if _COMPUTE_BUFFER
    float4 pt = _PointBuffer[input.vertexID];
    float4 pos = mul(_Transform, float4(pt.xyz, 1));
    half3 col = PcxDecodeColor(asuint(pt.w));
#else
    float4 pos = input.position;
    half3 col = input.color;
#endif

#if !PCX_SHADOW_CASTER
    // Color space convertion & applying tint
    #if UNITY_COLORSPACE_GAMMA
        col *= _Tint.rgb * 2;
    #else
        col *= LinearToGammaSpace(_Tint.rgb) * 2;
        col = GammaToLinearSpace(col);
    #endif
#endif

    // Set vertex output.
    Varyings o;
    o.position = UnityObjectToClipPos(pos);
#if !PCX_SHADOW_CASTER
    o.color = col;
    UNITY_TRANSFER_FOG(o, o.position);
#endif
    return o;
}

// Geometry phase
[maxvertexcount(6)]
void Geometry(point Varyings input[1], inout TriangleStream<Varyings> outStream)
{
    // Copy the basic information.
    Varyings o = input[0];

    // Calculate half the extent based on the point size.
    float2 halfExtent = abs(UNITY_MATRIX_P._11_22 * 0.5 * _PointSize);

    // Adjust the quad vertices to form a complete square.
    o.position.x -= halfExtent.x;  // Bottom-left
    o.position.y += halfExtent.y;
    outStream.Append(o);

    o.position.x += 2 * halfExtent.x;  // Bottom-right
    outStream.Append(o);

    o.position.y -= 2 * halfExtent.y;  // Top-right
    outStream.Append(o);
    
    // Top-right
    outStream.Append(o);

    o.position.x -= 2 * halfExtent.x;  // Top-left
    outStream.Append(o);

    o.position.y += 2 * halfExtent.y;  // Bottom-left
    outStream.Append(o);
}

half4 Fragment(Varyings input) : SV_Target
{
#if PCX_SHADOW_CASTER
    return 0;
#else
    half4 c = half4(input.color, _Tint.a);
    UNITY_APPLY_FOG(input.fogCoord, c);
    return c;
#endif
}

