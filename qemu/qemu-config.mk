# Global options for all VMs
# Most variables can be overridden (`make VM_QEMU_DISPLAY=sdl f36`)

VM_QEMU := qemu-system-x86_64

lscpu-count = $(shell lscpu -p=$(1) | grep -v '^#' | sort -u | wc -l)

VM_CPU_COUNT := $(call lscpu-count,cpu)
VM_CPU_CORES := $(call lscpu-count,core)
VM_CPU_SOCKETS := $(call lscpu-count,socket)

MEM_TOTAL_KB := $(shell awk '/^MemTotal:/{print $$2}' /proc/meminfo)
VM_MEM := $(shell expr $(MEM_TOTAL_KB) / 1024 / 2)

list-preferred = $(foreach v,$(1),$(findstring $(v),$(2)))
choose-preferred = $(firstword $(call list-preferred,$(1),$(2)))

VM_QEMU_DISPLAY := $(call choose-preferred,gtk spice-app sdl,$(shell $(VM_QEMU) -display help))

ifneq ($(shell $(VM_QEMU) -device help | grep virtio-vga-gl),)
VM_QEMU_VGA_DEVICE := virtio-vga-gl
else
VM_QEMU_VGA_DEVICE := $(call choose-preferred,virtio qxl,$(shell $(VM_QEMU) -vga help))-vga
endif

ifeq ($(VM_QEMU_DISPLAY),spice-app)
VM_SPICE_VDAGENT_CHARDEV := spicevmc
VM_SPICE_VDAGENT_EXTRA_FLAGS :=
else
VM_SPICE_VDAGENT_CHARDEV := qemu-vdagent
VM_SPICE_VDAGENT_EXTRA_FLAGS := clipboard=on
endif

ifeq ($(VM_QEMU_VGA_DEVICE),virtio-vga-gl)
VM_QEMU_GL := on
else
VM_QEMU_GL := off
endif

VM_QEMU_OPTIONS := \
	-m $(VM_MEM) \
	-cpu host \
	-smp $(VM_CPU_COUNT),cores=$(VM_CPU_CORES),sockets=$(VM_CPU_SOCKETS) \
	-enable-kvm \
	-nodefaults \
	-device virtio-balloon \
	-device virtio-serial \
	-serial vc \
	-monitor vc \
	-device $(VM_QEMU_VGA_DEVICE) \
	-display $(VM_QEMU_DISPLAY),gl=$(VM_QEMU_GL),show-cursor=on \
	-virtfs 'local,path=..,mount_tag=ddterm,security_model=none' \
	-device virtserialport,chardev=spicechannel0,name=com.redhat.spice.0 \
	-chardev $(VM_SPICE_VDAGENT_CHARDEV),id=spicechannel0,name=vdagent,$(VM_SPICE_VDAGENT_EXTRA_FLAGS) \
