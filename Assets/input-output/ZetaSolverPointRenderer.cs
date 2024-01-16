// Pcx - Point cloud importer & renderer for Unity
// https://github.com/keijiro/Pcx

using UnityEngine;

/// A renderer class that renders a point cloud contained by PointCloudData.
public sealed class ZetaSolverPointRenderer : MonoBehaviour
{
    #region Editable attributes

    [SerializeField] ZetaSolverPointData _sourceData = null;

    public ZetaSolverPointData sourceData
    {
        get { return _sourceData; }
        set { _sourceData = value; }
    }

    [SerializeField] Color _pointTint = new Color(0.5f, 0.5f, 0.5f, 1);

    public Color pointTint
    {
        get { return _pointTint; }
        set { _pointTint = value; }
    }

    [SerializeField] float _pointSize = 0.05f;

    public float pointSize
    {
        get { return _pointSize; }
        set { _pointSize = value; }
    }

    #endregion

    #region Public properties (nonserialized)

    public ComputeBuffer sourceBuffer { get; set; }

    #endregion

    #region Internal resources

    public Shader _pointShader = null;
    public Shader _shapeShader = null;

    #endregion

    #region Private objects

    Material _pointMaterial;
    Material _shapeMaterial;

    #endregion

    #region MonoBehaviour implementation

    void OnValidate()
    {
        _pointSize = Mathf.Max(0, _pointSize);
    }

    void OnDestroy()
    {
        if (_pointMaterial != null)
        {
            if (Application.isPlaying)
            {
                Destroy(_pointMaterial);
                Destroy(_shapeMaterial);
            }
            else
            {
                DestroyImmediate(_pointMaterial);
                DestroyImmediate(_shapeMaterial);
            }
        }
    }

    void OnRenderObject()
    {
        // We need a source data or an externally given buffer.
        if (_sourceData == null && sourceBuffer == null) return;

        // Check the camera condition.
        var camera = Camera.current;
        // Camera[] cams = new Camera[2];
        // Camera.GetAllCameras(cams);
        
        // if(camera.name == cams[0].name) camera = cams[1];
        // else camera = cams[0];
        
        if ((camera.cullingMask & (1 << gameObject.layer)) == 0) return;
        if (camera.name == "Preview Scene Camera") return;

        // TODO: Do view frustum culling here.

        // Lazy initialization
        if (_pointMaterial == null)
        {
            _pointMaterial = new Material(_pointShader);
            _pointMaterial.hideFlags = HideFlags.DontSave;
            _pointMaterial.EnableKeyword("_COMPUTE_BUFFER");

            _shapeMaterial = new Material(_shapeShader);
            _shapeMaterial.hideFlags = HideFlags.DontSave;
            _shapeMaterial.EnableKeyword("_COMPUTE_BUFFER");
        }

        // Use the external buffer if given any.
        var pointBuffer = sourceBuffer != null ?
            sourceBuffer : _sourceData.computeBuffer;

        if (_pointSize == 0)
        {
            _pointMaterial.SetPass(0);
            _pointMaterial.SetColor("_Tint", _pointTint);
            _pointMaterial.SetMatrix("_Transform", transform.localToWorldMatrix);
            _pointMaterial.SetBuffer("_PointBuffer", pointBuffer);
#if UNITY_2019_1_OR_NEWER
            Graphics.DrawProceduralNow(MeshTopology.Points, pointBuffer.count, 1);
#else
                Graphics.DrawProcedural(MeshTopology.Points, pointBuffer.count, 1);
#endif
        }
        else
        {
            _shapeMaterial.SetPass(0);
            _shapeMaterial.SetColor("_Tint", _pointTint);
            _shapeMaterial.SetMatrix("_Transform", transform.localToWorldMatrix);
            _shapeMaterial.SetBuffer("_PointBuffer", pointBuffer);
            // _shapeMaterial.SetFloat("_PointSize", camera.orthographicSize * pointSize);
            _shapeMaterial.SetFloat("_PointSize", pointSize);
#if UNITY_2019_1_OR_NEWER
            Graphics.DrawProceduralNow(MeshTopology.Points, pointBuffer.count, 1);
#else
                Graphics.DrawProcedural(MeshTopology.Points, pointBuffer.count, 1);
#endif
        }
    }

    #endregion
}
