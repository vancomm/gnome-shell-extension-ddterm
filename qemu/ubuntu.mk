# Inputs:
# VM_UBUNTU_CODENAME
# VM_DOWNLOAD_COMMAND (download.mk)
# VM_QEMU (vm.mk)
# VM_QEMU_OPTIONS (vm.mk)
# VM_CREATE_DISK_SIZE (vm.mk)
# VM_CREATE_DISK_OPTIONS (vm.mk)
# VM_SSH_KEY (vm.mk)
# VM_CONFIG_DISK (vm.mk)

VM_NAME := $(VM_UBUNTU_CODENAME)
VM_UBUNTU_BASE_URL := https://cloud-images.ubuntu.com/$(VM_UBUNTU_CODENAME)/current
VM_IMAGE_URL := $(VM_UBUNTU_BASE_URL)/$(VM_UBUNTU_CODENAME)-server-cloudimg-amd64.img
VM_IMAGE_CHECKSUM_URL := $(VM_UBUNTU_BASE_URL)/SHA256SUMS

include vm.mk
