#!/usr/bin/env -S make -f

all:

include qemu-config.mk

VM_CREATE_DISK_SIZE := 10G
VM_CREATE_DISK_OPTIONS := extended_l2=on,cluster_size=256K,preallocation=metadata,lazy_refcounts=on,nocow=on

ifneq ($(shell command -v wget),)
VM_DOWNLOAD_COMMAND = wget -O $@ $(VM_DOWNLOAD_URL)
else
VM_DOWNLOAD_COMMAND = curl -Lo $@ $(VM_DOWNLOAD_URL)
endif

include cloud-init.mk

# VMs

VM_FEDORA_VERSION := 35
VM_FEDORA_IMAGE_VERSION := 1.2

include fedora.mk

VM_FEDORA_VERSION := 36
VM_FEDORA_IMAGE_VERSION := 1.5

include fedora.mk

VM_FEDORA_VERSION := 37_Beta
VM_FEDORA_IMAGE_VERSION := 1.5
VM_FEDORA_URL_SUBDIR := test

include fedora.mk

VM_UBUNTU_CODENAME := focal

include ubuntu.mk

VM_UBUNTU_CODENAME := jammy

include ubuntu.mk

VM_UBUNTU_CODENAME := kinetic

include ubuntu.mk

.PHONY: all download clean distclean
