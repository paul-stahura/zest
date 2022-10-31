public static class ArrayUtils
{
    /// <summary>
    /// Get the array slice between the two indexes.
    /// ... Inclusive for start index, exclusive for end index.
    /// </summary>
    public static T[] Slice<T>(this T[] source, int start, int end)
    {
        // Handles negative ends.
        if (end < 0)
        {
            end = source.Length + end;
        }
        int len = end - start;

        // Return new array.
        T[] res = new T[len];
        for (int i = 0; i < len; i++)
        {
            res[i] = source[i + start];
        }
        return res;
    }
}

public struct ArraySlice<T>
{

    T[] array;
    int start;
    int end;

    public int Length => end - start;

    public ref T this[int i] => ref array[start + i];

    public ArraySlice(T[] array, int start, int end)
    {
        this.array = array;
        this.start = start;
        this.end = end;
    }

}