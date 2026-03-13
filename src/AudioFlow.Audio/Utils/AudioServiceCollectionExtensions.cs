using AudioFlow.Audio.Abstractions;
using AudioFlow.Audio.Providers;
using Microsoft.Extensions.DependencyInjection;

namespace AudioFlow.Audio.Utils;

public static class AudioServiceCollectionExtensions
{
    public static IServiceCollection AddAudioFlowAudio(this IServiceCollection services)
    {
        services.AddSingleton<IAudioProviderFactory, AudioProviderFactory>();
        return services;
    }
}
