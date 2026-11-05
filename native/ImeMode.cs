// Learning prototype only: validate against Windows 11 + Microsoft Pinyin + VS Code.
// get is read-only; zh/en change the active VS Code control's IME state.
// No keyboard simulation, input injection, process injection or registry changes.
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

internal static class ImeMode
{
    const uint WM_IME_CONTROL = 0x0283;
    const uint GET_CONVERSION = 0x0001, SET_CONVERSION = 0x0002;
    const uint GET_OPEN = 0x0005, SET_OPEN = 0x0006;
    const uint NATIVE = 0x0001;

    [StructLayout(LayoutKind.Sequential)]
    struct Rect { public int Left, Top, Right, Bottom; }

    [StructLayout(LayoutKind.Sequential)]
    struct GuiThreadInfo
    {
        public uint Size, Flags;
        public IntPtr Active, Focus, Capture, MenuOwner, MoveSize, Caret;
        public Rect CaretRect;
    }

    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    static extern bool GetGUIThreadInfo(uint thread, ref GuiThreadInfo info);
    [DllImport("user32.dll")]
    static extern IntPtr GetKeyboardLayout(uint thread);
    [DllImport("imm32.dll")]
    static extern IntPtr ImmGetDefaultIMEWnd(IntPtr window);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern IntPtr SendMessageTimeoutW(IntPtr window, uint message,
        UIntPtr command, IntPtr value, uint flags, uint timeout, out UIntPtr result);

    static IntPtr foreground, focus, imeWindow, layout;
    static uint threadId;

    static GuiThreadInfo GetInfo()
    {
        var info = new GuiThreadInfo();
        info.Size = (uint)Marshal.SizeOf(typeof(GuiThreadInfo));
        if (!GetGUIThreadInfo(threadId, ref info) || info.Focus == IntPtr.Zero)
            throw new InvalidOperationException("Cannot identify the focused control.");
        return info;
    }

    // Recheck the target before each request; this is not an atomic focus lock.
    static uint Send(uint command, uint value)
    {
        if (GetForegroundWindow() != foreground || GetInfo().Focus != focus ||
            GetKeyboardLayout(threadId) != layout)
            throw new InvalidOperationException("Focus or keyboard layout changed; request cancelled.");
        UIntPtr result;
        var ok = SendMessageTimeoutW(imeWindow, WM_IME_CONTROL,
            new UIntPtr(command), new IntPtr((long)value), 0x0022, 300, out result);
        if (ok == IntPtr.Zero)
            throw new InvalidOperationException("IME message failed or timed out.");
        return unchecked((uint)result.ToUInt64());
    }

    public static int Main(string[] args)
    {
        try
        {
            if (args.Length == 1 && args[0] == "--help")
            {
                Console.WriteLine("Usage: ImeMode.exe get|zh|en [delayMilliseconds]");
                Console.WriteLine("Select Microsoft Pinyin and focus a VS Code text editor first.");
                Console.WriteLine("Prototype: validate get output manually before using zh/en.");
                return 0;
            }
            if (args.Length < 1 || args.Length > 2 ||
                (args[0] != "get" && args[0] != "zh" && args[0] != "en"))
                throw new ArgumentException("Usage: ImeMode.exe get|zh|en [delayMilliseconds]");
            int delay = 0;
            if (args.Length == 2 && (!int.TryParse(args[1], out delay) || delay < 0 || delay > 10000))
                throw new ArgumentException("Delay must be between 0 and 10000 milliseconds.");
            if (delay > 0) Thread.Sleep(delay);

            foreground = GetForegroundWindow();
            if (foreground == IntPtr.Zero) throw new InvalidOperationException("No foreground window.");
            uint pid;
            threadId = GetWindowThreadProcessId(foreground, out pid);
            using (var process = Process.GetProcessById((int)pid))
            {
                if (!string.Equals(process.ProcessName, "Code", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("Foreground application must be VS Code (Code.exe).");
            }
            focus = GetInfo().Focus;
            layout = GetKeyboardLayout(threadId);
            if ((layout.ToInt64() & 0xFFFF) != 0x0804)
                throw new InvalidOperationException("Select Chinese (Simplified), Microsoft Pinyin first.");
            // Language ID alone cannot prove which Chinese IME is selected.
            imeWindow = ImmGetDefaultIMEWnd(focus);
            if (imeWindow == IntPtr.Zero)
                throw new InvalidOperationException("No compatible default IME window.");

            uint before = Send(GET_CONVERSION, 0);
            bool beforeOpen = Send(GET_OPEN, 0) != 0;
            if (args[0] != "get")
            {
                bool chinese = args[0] == "zh";
                uint desired = chinese ? (before | NATIVE) : (before & ~NATIVE);
                if (chinese && Send(SET_OPEN, 1) != 0)
                    throw new InvalidOperationException("IME rejected open request.");
                if (Send(SET_CONVERSION, desired) != 0)
                    throw new InvalidOperationException("IME rejected conversion mode request.");
                if (!chinese && Send(SET_OPEN, 0) != 0)
                    throw new InvalidOperationException("IME rejected close request.");
                Thread.Sleep(80);
            }

            uint after = Send(GET_CONVERSION, 0);
            bool afterOpen = Send(GET_OPEN, 0) != 0;
            bool native = (after & NATIVE) != 0;
            string candidate = afterOpen && native ? "zh" : "en";
            if (args[0] != "get" && (candidate != args[0] || native != (args[0] == "zh")))
                throw new InvalidOperationException("Read-back did not match requested mode; this method may be unsupported.");

            // A successful reply/read-back is NOT proof of actual IME behavior.
            // Confirm by manual mode changes and actual typing before integration.
            Console.WriteLine("{{\"requested\":\"{0}\",\"modeCandidate\":\"{1}\",\"beforeConversion\":{2},\"beforeOpen\":{3},\"conversion\":{4},\"open\":{5},\"compatibilityValidated\":false}}",
                args[0], candidate, before, beforeOpen ? "true" : "false", after, afterOpen ? "true" : "false");
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error.Message);
            return 1;
        }
    }
}
