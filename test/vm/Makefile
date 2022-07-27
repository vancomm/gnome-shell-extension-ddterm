#!/usr/bin/env -S make -f

SHELL := /bin/bash

DISK_SIZE := 50G
QCOW2_OPTIONS := preallocation=metadata,lazy_refcounts=on,nocow=on,extended_l2=on

CPUS := $(shell nproc)
CPU_CORES := $(shell grep 'core id' /proc/cpuinfo | sort -u | wc -l)

BIOS := /usr/share/ovmf/x64/OVMF.fd

MKDIRS :=

.SECONDEXPANSION:
.DELETE_ON_ERROR:

mkpath = mkdir -p $(dir $@)
download = $(mkpath) && curl -o $@ '$(patsubst downloads/%,https://%,$@)'
check-sha256 = set -o pipefail; cd $(dir $@) && grep $(notdir $@) $(abspath $(1)) | sha256sum -c -

downloads/cloud-images.ubuntu.com/%/SHA256SUMS:
	$(download)

downloads/cloud-images.ubuntu.com/%: $$(dir $$@)/SHA256SUMS
	$(download)
	$(call check-sha256,$<)

data/%/hdd.qcow2:
	$(mkpath)
	$(RM) $@
	qemu-img create -f qcow2 -b $(abspath $<) -F qcow2 -o $(QCOW2_OPTIONS) $@ $(DISK_SIZE)

data/%/cloud-init/meta-data:
	$(mkpath)
	echo 'instance-id: $*' >$@
	echo 'local-hostname: $*' >>$@

data/%/cloud-init/user-data:

disks/ubuntu-20.04.qcow2: downloads/cloud-images.ubuntu.com/releases/focal/release-20220711/ubuntu-20.04-server-cloudimg-amd64.img

run/%: disks/%.qcow2
	qemu-system-x86_64 \
	-name $* \
	-machine type=q35,accel=kvm \
	-cpu host \
	-smp $(CPUS),cores=$(CPU_CORES) \
	-m 1G,slots=3,maxmem=4G \
	-device virtio-balloon \
	-nic user,model=virtio \
	-bios $(BIOS) \
	-drive file=$<,if=virtio,media=disk,format=qcow2,discard=on,detect-zeroes=unmap \
	-vga virtio \
	-display gtk,gl=on
