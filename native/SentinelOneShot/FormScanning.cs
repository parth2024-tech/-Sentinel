using System;
using System.Drawing;
using System.Windows.Forms;

namespace SentinelOneShot;

public class FormScanning : Form
{
    private Label lblStatus;
    private ProgressBar progressBar;

    public FormScanning()
    {
        this.Text = "Sentinel Diagnostics";
        this.Size = new Size(400, 150);
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.MaximizeBox = false;
        this.MinimizeBox = false;
        this.StartPosition = FormStartPosition.CenterScreen;
        this.Icon = SystemIcons.Information;
        this.ShowInTaskbar = true;

        lblStatus = new Label
        {
            Text = "Sentinel is scanning your hardware...",
            Location = new Point(20, 20),
            AutoSize = true,
            Font = new Font("Segoe UI", 10)
        };
        this.Controls.Add(lblStatus);

        progressBar = new ProgressBar
        {
            Style = ProgressBarStyle.Marquee,
            MarqueeAnimationSpeed = 30,
            Location = new Point(20, 60),
            Size = new Size(340, 20)
        };
        this.Controls.Add(progressBar);
    }
}
