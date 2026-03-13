using System.Reflection;

namespace AudioFlow.Visualization.Core;

public sealed class VisualizerFactory
{
    private readonly Dictionary<string, Func<IVisualizer>> _registry = new(StringComparer.OrdinalIgnoreCase);

    public void Register<TVisualizer>() where TVisualizer : IVisualizer, new()
    {
        var instance = new TVisualizer();
        _registry[instance.Name] = () => new TVisualizer();
    }

    public IReadOnlyList<string> GetAvailableNames() => _registry.Keys.ToList();

    public IVisualizer Create(string name)
    {
        if (!_registry.TryGetValue(name, out var factory))
        {
            throw new InvalidOperationException($"Visualizer '{name}' not registered.");
        }

        return factory();
    }

    public void LoadFromDirectory(string directory)
    {
        if (!Directory.Exists(directory))
        {
            return;
        }

        foreach (var file in Directory.GetFiles(directory, "*.dll"))
        {
            LoadFromAssembly(file);
        }
    }

    private void LoadFromAssembly(string path)
    {
        Assembly assembly;
        try
        {
            assembly = Assembly.LoadFrom(path);
        }
        catch
        {
            return;
        }

        foreach (var type in assembly.GetTypes())
        {
            if (type.IsAbstract || !typeof(IVisualizer).IsAssignableFrom(type))
            {
                continue;
            }

            if (type.GetConstructor(Type.EmptyTypes) == null)
            {
                continue;
            }

            var instance = (IVisualizer)Activator.CreateInstance(type)!;
            _registry[instance.Name] = () => (IVisualizer)Activator.CreateInstance(type)!;
        }
    }
}
