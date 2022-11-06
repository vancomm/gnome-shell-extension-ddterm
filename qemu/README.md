# QEMU VMs for testing on various distributions

## Dependencies

* QEMU
* Ansible
* `cloud-utils` or `cloud-image-utils` package (`cloud-localds`, `write-mime-multipart`)
* `expect`
* `socat`

## Start a VM

`make <vm-name>` - sets up and starts a VM, if it isn't running already.
Installs `../ddterm@amezin.github.com.shell-extension.zip` into it.

Login: `ddterm`. Password: `ddterm`

## SSH Connection

`make <vm-name>/ssh` - sets up and starts a VM, if it isn't running already.
Opens SSH connection.

## VM names

Fedora: `f<version>`:

* `f35`
* `f36`
* `f37_Beta`

Ubuntu: `<codename>`:

* `focal` (20.04)
* `jammy` (22.04)
* `kinetic` (22.10)

Ubuntu images are updated much more frequently, so initial package upgrade is
usually faster for them, compared to Fedora images.

## Troubleshooting

Currently, there are countless issues with QEMU GUI, especially on Wayland.

### Grabs not working on Wayland

Try:

    $ SDL_VIDEODRIVER=wayland make VM_QEMU_DISPLAY=sdl <vm-name>

This seems to be the most reliable config on Wayland overall. And make sure you
have `libdecor` installed - otherwise SDL's Wayland window will have no frame.

### Mouse position calculated incorrectly in Gtk UI on high DPI screen

Try:

    $ make VM_QEMU_GL=on <vm-name>

It seems to happen when OpenGL is not enabled.
