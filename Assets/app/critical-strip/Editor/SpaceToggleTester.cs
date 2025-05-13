// #if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using System.Collections.Generic;
using System;
/// <summary>
/// Editor utility for testing the conversion between index and imaginary space.
/// Provides menu items and a custom editor window to visualize and test conversions.
/// </summary>
public class SpaceToggleTester : EditorWindow
{
    // Test values for index to imaginary conversions
    private List<int> testIndices = new List<int> { 0, 1, 2, 3, 5, 7, 9, 11, 13, 15, 20, 30 };
    
    // Test values for imaginary to index conversions
    private List<double> testImagValues = new List<double> 
    { 
        14.13, 21.02, 30.42, 56.45, 75.70, 
        100.0, 200.0, 300.0, 500.0, 750.0, 830.0 
    };
    
    private Vector2 scrollPosition;
    private bool usePolyFormula = false;


    static double IndexToImag(double index, bool usePoly=false)  // n is the index of the link in question.  
    {
        //. This is from Zzrob
        // "Einstein" becasue it is exact
        // return ((float_index*2 +1)*Pi/denominator)
        // TODO: denominator lookup
        // this is where it is chris   ( π (2 n + 1))/( log(n + 1) - log(n))   
        var n = index;

        if(usePoly)
        {
            // new
            // 2pi*(t^2+t+1/6)
            return 2.0 * Math.PI * ((n*n) + n + (1.0/6.0));
        }
        else
        {
            // ( π (2 n + 1))/( log(n + 1) - log(n))
            return (n * 2.0 + 1.0) * Math.PI / (Math.Log(n + 1.0) - Math.Log(n));
        }

        



        // from dfold: Exact conversion from index to imaginary
        // return Math.PI * (2.0 * index + 1.0) / Math.Log(1.0/index + 1.0);
    }

    static double ImagToIndex(double imag)  //given imag, what is the index of the segment?
    {


        //best so far -- this is from Zzrob
        double gamma = 0.57721566490153286060651209008240243104215933593992;
        double e = 2.7182818284590452353602874713526624977572;
        double gamma_to_the_e = Math.Pow(gamma, e);   // = .2245172519832320
        double two_root_3_pi = 2 * Math.Sqrt(3 * Math.PI);
        double return_this = Math.Sqrt(6 * gamma_to_the_e / imag + 6 * imag + Math.PI) / two_root_3_pi - 1.0 / 2.0;

        return (return_this);



        // from dfold
        // Returns the approximate middle index of the spiral given the imaginary 
        // part of the of the input to the Zeta function
        // return Math.Sqrt(
        //     1 / (2 * Math.PI) * (
        //         1 / (2 * Math.Atan(Math.Sqrt(2))) + 
        //         imag + 
        //         1 / (imag * (2 * Math.E - 1))
        //     ) - .5
        // );
    }

    [MenuItem("Critical Strip/Space Toggle Testing")]
    public static void ShowWindow()
    {
        GetWindow<SpaceToggleTester>("Space Toggle Tester");
    }

    private void OnGUI()
    {
        EditorGUILayout.LabelField("Space Conversion Testing", EditorStyles.boldLabel);
        EditorGUILayout.Space();
        
        usePolyFormula = EditorGUILayout.Toggle("Use Polynomial Formula", usePolyFormula);
        
        scrollPosition = EditorGUILayout.BeginScrollView(scrollPosition);
        
        EditorGUILayout.LabelField("Index to Imaginary Conversion", EditorStyles.boldLabel);
        EditorGUILayout.BeginVertical("box");
        
        foreach (int index in testIndices)
        {
            double imag = IndexToImag(index, usePolyFormula);
            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField($"Index: {index}", GUILayout.Width(100));
            EditorGUILayout.LabelField("→", GUILayout.Width(20));
            EditorGUILayout.LabelField($"Imag: {imag:F3}", GUILayout.Width(150));
            EditorGUILayout.EndHorizontal();
        }
        
        EditorGUILayout.EndVertical();
        EditorGUILayout.Space(10);
        
        EditorGUILayout.LabelField("Imaginary to Index Conversion", EditorStyles.boldLabel);
        EditorGUILayout.BeginVertical("box");
        
        foreach (double imag in testImagValues)
        {
            double index = ImagToIndex(imag);
            double backConversion = IndexToImag(index, usePolyFormula);
            double error = System.Math.Abs(imag - backConversion) / imag * 100; // Error as percentage
            
            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.LabelField($"Imag: {imag:F2}", GUILayout.Width(100));
            EditorGUILayout.LabelField("→", GUILayout.Width(20));
            EditorGUILayout.LabelField($"Index: {index:F3}", GUILayout.Width(100));
            EditorGUILayout.LabelField("→", GUILayout.Width(20));
            EditorGUILayout.LabelField($"Imag: {backConversion:F2}", GUILayout.Width(120));
            
            // Color-code the error
            GUI.color = error < 1 ? Color.green : (error < 5 ? Color.yellow : Color.red);
            EditorGUILayout.LabelField($"Error: {error:F2}%", GUILayout.Width(100));
            GUI.color = Color.white;
            
            EditorGUILayout.EndHorizontal();
        }
        
        EditorGUILayout.EndVertical();
        EditorGUILayout.Space(10);
        
        // Custom value testing
        EditorGUILayout.LabelField("Custom Value Testing", EditorStyles.boldLabel);
        EditorGUILayout.BeginVertical("box");
        
        CustomValueTesting();
        
        EditorGUILayout.EndVertical();
        
        EditorGUILayout.EndScrollView();
    }
    
    private float customIndex = 5.0f;
    private float customImag = 240.0f;
    
    private void CustomValueTesting()
    {
        EditorGUILayout.BeginHorizontal();
        EditorGUILayout.LabelField("Custom Index:", GUILayout.Width(100));
        customIndex = EditorGUILayout.FloatField(customIndex, GUILayout.Width(100));
        if (GUILayout.Button("Convert to Imag", GUILayout.Width(120)))
        {
            customImag = (float)IndexToImag(customIndex, usePolyFormula);
            GUI.FocusControl(null);
        }
        EditorGUILayout.EndHorizontal();
        
        EditorGUILayout.BeginHorizontal();
        EditorGUILayout.LabelField("Custom Imag:", GUILayout.Width(100));
        customImag = EditorGUILayout.FloatField(customImag, GUILayout.Width(100));
        if (GUILayout.Button("Convert to Index", GUILayout.Width(120)))
        {
            customIndex = (float)ImagToIndex(customImag);
            GUI.FocusControl(null);
        }
        EditorGUILayout.EndHorizontal();
        
        EditorGUILayout.Space(5);
        
        if (GUILayout.Button("Find Viewport Range for Current Renderer"))
        {
            var renderer = FindObjectOfType<CriticalStripRenderer>();
            if (renderer != null && renderer.GetTransform() != null)
            {
                var transform = renderer.GetTransform();
                
                // Get current ranges
                float minIndex = transform.MinIndex;
                float maxIndex = transform.MaxIndex;
                float minImag = (float)IndexToImag(minIndex, usePolyFormula);
                float maxImag = (float)IndexToImag(maxIndex, usePolyFormula);
                
                // Log information
                Debug.Log($"Current Viewport Ranges:\n" +
                         $"Index: [{minIndex:F2}, {maxIndex:F2}] (range: {maxIndex-minIndex:F2})\n" +
                         $"Imag: [{minImag:F2}, {maxImag:F2}] (range: {maxImag-minImag:F2})");
            }
            else
            {
                Debug.LogWarning("No active CriticalStripRenderer found in scene!");
            }
        }
    }
}
// #endif 