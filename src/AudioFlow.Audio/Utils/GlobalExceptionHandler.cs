using System.Threading;

namespace AudioFlow.Audio.Utils;

public static class GlobalExceptionHandler
{
    private static int _registered;

    public static void Register(Action<Exception> onUnhandled)
    {
        if (onUnhandled == null)
        {
            throw new ArgumentNullException(nameof(onUnhandled));
        }

        if (Interlocked.Exchange(ref _registered, 1) == 1)
        {
            return;
        }

        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
        {
            if (args.ExceptionObject is Exception exception)
            {
                onUnhandled(exception);
            }
        };

        TaskScheduler.UnobservedTaskException += (_, args) =>
        {
            onUnhandled(args.Exception);
            args.SetObserved();
        };
    }
}
