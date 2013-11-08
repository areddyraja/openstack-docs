---
title: OpenStack Installation
---

#OpenStack Grizzly Installation - Single Node                   

##Contents 

1. Requirements

2. Getting Started

3. Keystone

4. Glance

5. Quantum

6. Nova

7. Cinder

8. Horizon

9. Your first VM 



##Requirements

<html>
<head>
<style>

.dam

{
width:50%;
}

</style>
</head>

<body>
<table class="dam">
<tr>
</tr>
<tr>
<th  height="30" bgcolor="#bad2e9">Node Role</th>
<th  bgcolor="#bad2e9">NICS</th>
</tr>
<tr>
<td  height="30">Single Node</td>
<td>eth0 (10.10.100.51)<br>
eth1 (10.42.0.51)</td>
</tr>
</table>
</body>
</html>

##Getting Started

###Preparing Ubuntu
   
<ol>
<li><p>Change to super user mode for rest of the document</p>

```bash
$sudo su
```
</li>
<li><p>Add Grizzly repositories to get the packages for OpenStack Grizzly release:</p>

```bash
#apt-get install ubuntu-cloud-keyring python-software-properties software-properties-common python-keyring
#echo deb http://ubuntu-cloud.archive.canonical.com/ubuntu precise-updates/grizzly main >> /etc/apt/sources.list.d/grizzly.list
```
</li>
<li>Update and Upgrade the ubuntu OS:
```bash
#apt-get update
#apt-get upgrade
#apt-get dist-upgrade
```
</li>
</ol>

*Note: On AMD machines create a volume-group called "cinder-volumes" while installing Ubuntu12.04 and for Intel machines create an empty partition which can later be used for creating a volume-group*


###Networking
<ol>
<li><p>For OpenStack Single-Node setup you will require 2 NIC's, One NIC <code>10.42.0.51</code> is used for external network connection i.e, Internet access and the other NIC <code>10.10.100.51</code> is used for internal networking (OpenStack management).</p></li>

*Note: The external NIC should have a static IP address.*

<li><p>Edit network settings to add configuration for two interfaces <code>eth0</code> and <code>eth1</code>. </p>

<div>
<img src="/images/network-interfaces.png" alt="network-interfaces"/>
</div>
<div>
```bash
#vi /etc/network/interfaces
#For Exposing OpenStack API over the internet
    auto eth1
    iface eth1 inet static
    address 10.42.0.51
    netmask 255.255.255.0
    gateway 10.42.0.1
    dns-nameservers 8.8.8.8

    #Not internet connected(used for OpenStack management)
    auto eth0
    iface eth0 inet static
    address 10.10.100.51
    netmask 255.255.255.0
```
</div>


</li>

<li><p>Restart the Networking Service:</p>

```bash
#/etc/init.d/networking restart
```
</li>
</ol>

###MySQL & RabbitMQ

<ol>
<li><p>Install MySQL:</p>

```bash
#apt-get install -y mysql-server python-mysqldb
```

<p>During the install, you'll be prompted for the mysql root password. Enter a password of your choice and verify it.</p>
</li>

<li><p>Configure mysql to accept all incoming requests:</p>
</li>

```bash
#sed -i 's/127.0.0.1/0.0.0.0/g' /etc/mysql/my.cnf
#service mysql restart
```

<li><p>Install RabbitMQ (Message Queue):</p>

<p>The OpenStack Cloud Controller communicates with other nova components such as <code>`Scheduler`</code>, <code>`Network Controller`</code>, and <code>`Volume Controller`</code> using <code>`AMQP`</code> (Advanced Message Queue Protocol). Nova components use Remote Procedure Calls (RPC) to communicate to one another.</p>

```bash
#apt-get install -y rabbitmq-server
```
</li>

<li><p>Install NTP service (Network Time Protocol):</p>

To keep all the services in sync, you need to install NTP, and if you do a multi-node configuration you will configure one server to be the reference server.

```bash
#apt-get install -y ntp
```
</li>
</ol>

###Others Services
<ol>
<li><p>Install vlan and bridge-utility</p> 
```bash
#apt-get install -y vlan bridge-utils
```
</li>

<li><p>Enable IP_Forwarding:</p>

<p>Enabling IP Forwarding makes the machine to act as a router or proxy server to share one internet connection to many client machines.</p>

```bash
#sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
```
</li>

<li><p>To save you from rebooting, perform the following</p>

```bash
#sysctl net.ipv4.ip_forward=1
```
</li>
</ol>


##Keystone
<ol>

Keystone is an identity service which supports various protocols for authentication and authorization. 
<li>
<p>Install keystone packages:</p>

```bash
#apt-get install -y keystone
```
</li>

<li><p>Verify your keystone is running:</p>

```bash
#service keystone status
```
</li>

<li><p>Create a new MySQL database for keystone:</p>

```bash
    mysql -u root -p
    CREATE DATABASE keystone;
    GRANT ALL ON keystone.* TO 'keystoneUser'@'%' IDENTIFIED BY 'keystonePass';
    quit;
```
</li>

<li><p>Adapt the connection attribute in the <code>/etc/keystone/keystone.conf</code> to the new database:</p>

```bash
    connection = mysql://keystoneUser:keystonePass@10.10.100.51/keystone
```
</li>

<li><p>Restart the identity service then synchronize the database:</p>

```bash
#service keystone restart
#keystone-manage db_sync
```
</li>

<li><p>Fill up the keystone database using the two scripts available in the Scripts folder of this git repository:</p>

<p>Modify the HOST_IP and HOST_IP_EXT variables before executing the scripts <code>HOST_IP(10.10.100.51)</code> and <code>HOST_IP_EXT(10.42.0.51)</code></p>

```bash
#wget https://raw.github.com/mseknibilel/OpenStack-Grizzly-Install-Guide/OVS_SingleNode/KeystoneScripts/keystone_basic.sh
#wget https://raw.github.com/mseknibilel/OpenStack-Grizzly-Install-Guide/OVS_SingleNode/KeystoneScripts/keystone_endpoints_basic.sh
#chmod +x keystone_basic.sh
#chmod +x keystone_endpoints_basic.sh
#./keystone_basic.sh
#./keystone_endpoints_basic.sh
```
</li>

<li><p>Create a simple credential file and load it:</p>

```bash
#nano creds
#Paste the following:
    export OS_TENANT_NAME=admin
    export OS_USERNAME=admin
    export OS_PASSWORD=admin_pass
    export OS_AUTH_URL="http://10.42.0.51:5000/v2.0/"
```
</li>

<li><p>Load it:</p>

```bash
#source creds
```
</li>

<li><p>To test Keystone, we use a simple CLI command:</p>

```bash
#keystone user-list
```
</li>
</ol>

##Glance

Glance provides services for discovering, registering, and retrieving virtual machine images. Stored images can be used as a template. It can also be used to store and catalog an unlimited number of backups.
<ol>
<li><p>
Install Glance packages:</p>

```bash
#apt-get install -y glance
```
</li>

<li><p>Verify your glance services are running:</p>

```bash
#service glance-api status
#service glance-registry status
```
</li>

<li><p>Create a new MySQL database for Glance:</p>

```bash
    mysql -u root -p
    CREATE DATABASE glance;
    GRANT ALL ON glance.* TO 'glanceUser'@'%' IDENTIFIED BY 'glancePass';
    quit;
```
</li>

<li><p>Update <code>/etc/glance/glance-api-paste.ini</code> with:</p>

```bash

    [filter:authtoken]
    paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
    delay_auth_decision = true
    auth_host = 10.10.100.51
    auth_port = 35357
    auth_protocol = http
    admin_tenant_name = service
    admin_user = glance
    admin_password = service_pass
```
</li>

<li><p>Update the <code>/etc/glance/glance-registry-paste.ini</code> with:</p>

```bash
    [filter:authtoken]
    paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
    auth_host = 10.10.100.51
    auth_port = 35357
    auth_protocol = http
    admin_tenant_name = service
    admin_user = glance
    admin_password = service_pass
```
</li>

<li><p>Update <code>/etc/glance/glance-api.conf</code> with:</p>

```bash
    sql_connection = mysql://glanceUser:glancePass@10.10.100.51/glance
    And:
    [paste_deploy]
    flavor = keystone
```
</li>

<li><p>Update the <code>/etc/glance/glance-registry.conf</code> with:</p>

```bash
    sql_connection = mysql://glanceUser:glancePass@10.10.100.51/glance
    And:
    [paste_deploy]
    flavor = keystone
```
</li>

<li><p>Restart the glance-api and glance-registry services:</p>

```bash
#service glance-api restart; service glance-registry restart
```
</li>

<li><p>Synchronize the glance database:</p>

```bash
#glance-manage db_sync
```
</li>

<li><p>Restart the services again to take into account the new modifications:</p>

```bash
#service glance-registry restart; service glance-api restart
```
</li>

<li><p>To test Glance, upload the cirros cloud image directly from the internet:</p>

```bash
#glance image-create --name myFirstImage --is-public true --container-format bare --disk-format qcow2 --location https://launchpad.net/    cirros/trunk/0.3.0/+download/cirros-0.3.0-x86_64-disk.img
```
</li>

<li><p>Now list the image to see what you have just uploaded:</p>

```bash
#glance image-list
```
</li>
</ol>

##Quantum

###Open vSwitch
<ol>
<li><p>Install the open vSwitch:</p>

```bash
#apt-get install -y openvswitch-switch openvswitch-datapath-dkms
```
</li>

<li><p>Create the bridges:</p>

```bash
#br-int will be used for VM integration
#ovs-vsctl add-br br-int
```
</li>

<li><p><code>br-ex</code> is used to access the external network.</p>

```bash
#ovs-vsctl add-br br-ex
```
</li>

<li><p>This will guide you to setting up the br-ex interface. Edit eth1 in <code>/etc/network/interfaces</code>:</p>

```bash
# VM internet Access
    auto eth1
    iface eth1 inet manual
    up ifconfig $IFACE 0.0.0.0 up
    up ip link set $IFACE promisc on
    down ip link set $IFACE promisc off
    down ifconfig $IFACE down
```
</li>

<li><p>Add the <code>eth1</code> interface to <code>br-ex</code>:</p>

<p>Internet connectivity will be lost after this step but this won't affect OpenStack's work</p>

```bash
#ovs-vsctl add-port br-ex eth1
```
</li>

<li><p>Optional, If you want to get internet connection back, you can assign the <code>eth1's</code> IP address to the <code>br-ex</code> in the <code>/etc/network/interfaces</code> file:</p>

```bash
    auto br-ex
    iface br-ex inet static
    address 10.42.0.51
    netmask 255.255.255.0
    gateway 10.42.0.1
    dns-nameservers 8.8.8.8
```
</li>
</ol>

###Quantum
<ol>
<li><p>Install the Quantum components:</p>

```bash
#apt-get install -y quantum-server quantum-plugin-openvswitch quantum-plugin-openvswitch-agent dnsmasq quantum-dhcp-agent quantum-l3-agent
```
</li>

<li><p>Create a database:</p>

```bash
    mysql -u root -p
    CREATE DATABASE quantum;
    GRANT ALL ON quantum.* TO 'quantumUser'@'%' IDENTIFIED BY 'quantumPass';
    quit;
```
</li>

<li><p>Verify all Quantum components are running:</p>

```bash
#cd /etc/init.d/; for i in $( ls quantum-* ); do sudo service $i status; done
```
</li>

<li><p>Edit <code>/etc/quantum/api-paste.ini</code></p>

```bash
    [filter:authtoken]
    paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
    auth_host = 10.10.100.51
    auth_port = 35357
    auth_protocol = http
    admin_tenant_name = service
    admin_user = quantum
    admin_password = service_pass
```
</li>

<li><p>Edit the OVS plugin configuration file <code>/etc/quantum/plugins/openvswitch/ovs_quantum_plugin.ini with</code>:</p>

Under the database section

```bash
    [DATABASE]
    sql_connection = mysql://quantumUser:quantumPass@10.10.100.51/quantum
```

Under the OVS section

```bash
    [OVS]
    tenant_network_type = gre
    tunnel_id_ranges = 1:1000
    integration_bridge = br-int
    tunnel_bridge = br-tun
    local_ip = 10.10.100.51
    enable_tunneling = True

    #Firewall driver for realizing quantum security group function
    [SECURITYGROUP]
    firewall_driver = quantum.agent.linux.iptables_firewall.OVSHybridIptablesFirewallDriver
```
</li>

<li><p>Update  <code>/etc/quantum/metadata_agent.ini</code>:</p>

```bash
#The Quantum user information for accessing the Quantum API.
    auth_url = http://10.10.100.51:35357/v2.0
    auth_region = RegionOne
    admin_tenant_name = service
    admin_user = quantum
    admin_password = service_pass

#IP address used by Nova metadata server
    nova_metadata_ip = 127.0.0.1

#TCP Port used by Nova metadata server
    nova_metadata_port = 8775
    metadata_proxy_shared_secret = helloOpenStack
```
</li>

<li><p>Edit your <code>/etc/quantum/quantum.conf</code>:</p>

```bash
    [keystone_authtoken]
    auth_host = 10.10.100.51
    auth_port = 35357
    auth_protocol = http
    admin_tenant_name = service
    admin_user = quantum
    admin_password = service_pass
    signing_dir = /var/lib/quantum/keystone-signing
```
</li>

<li><p>Restart all quantum services:</p>

```bash
#cd /etc/init.d/; for i in $( ls quantum-* ); do sudo service $i restart; done
#service dnsmasq restart
```
</li>
</ol>

##Nova

###KVM
<ol>
<li><p>Checking for hardware virtualization support:</p>

<p>The processors of your compute host need to support virtualization technology (VT) to use KVM.</p>
<p>Install the cpu package and use the kvm-ok command to check if your processor has VT support.</p>

```bash
#apt-get install cpu-checker
#kvm-ok
```
If the VT is enabled, you should see something like:

```bash
INFO: /dev/kvm exists
KVM acceleration can be used
```

</li>

<li><p>Normally you would get a good response. Now, move to install kvm and configure it:</p>

```bash
#apt-get install -y kvm libvirt-bin pm-utils
```
</li>

<li><p>Edit the <code>cgroup_device_acl</code> array in the <code>/etc/libvirt/qemu.conf</code> file to:</p>

```bash
    cgroup_device_acl = [
    "/dev/null", "/dev/full", "/dev/zero",
    "/dev/random", "/dev/urandom",
    "/dev/ptmx", "/dev/kvm", "/dev/kqemu",
    "/dev/rtc", "/dev/hpet","/dev/net/tun"
    ]
```
</li>

<li><p>Delete default virtual bridge</p>

```bash
#virsh net-destroy default
#virsh net-undefine default
```
</li>

<li><p>Enable live migration by updating <code>/etc/libvirt/libvirtd.conf</code> file:</p>

```bash
    listen_tls = 0
    listen_tcp = 1
    auth_tcp = "none"
```
</li>

<li><p>Edit libvirtd_opts variable in <code>/etc/init/libvirt-bin.conf</code> file:</p>

```bash
    env libvirtd_opts="-d -l"
```
</li>

<li><p>Edit <code>/etc/default/libvirt-bin</code> file</p>

```bash
    libvirtd_opts="-d -l"
```
</li>

<li><p>Restart the libvirt service and dbus to load the new values:</p>

```bash
#service dbus restart && service libvirt-bin restart
```
</li>
</ol>

###Nova
OpenStack Compute (Nova) is a cloud computing fabric controller (the main part of an IaaS system). 
<ol>
<li><p>Start by installing nova components:</p>

```bash
#apt-get install -y nova-api nova-cert novnc nova-consoleauth nova-scheduler nova-novncproxy nova-doc nova-conductor nova-compute-kvm
```
</li>

<li><p>Check the status of all nova-services:</p>

```bash
#cd /etc/init.d/; for i in $( ls nova-* ); do service $i status; cd; done
```
</li>

<li><p>Prepare a Mysql database for Nova:</p>

```bash
    mysql -u root -p
    CREATE DATABASE nova;
    GRANT ALL ON nova.* TO 'novaUser'@'%' IDENTIFIED BY 'novaPass';
    quit;
```
</li>

<li><p>Now modify authtoken section in the <code>/etc/nova/api-paste.ini</code> file to this:</p>

```bash
    [filter:authtoken]
    paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
    auth_host = 10.10.100.51
    auth_port = 35357
    auth_protocol = http
    admin_tenant_name = service
    admin_user = nova
    admin_password = service_pass
    signing_dirname = /tmp/keystone-signing-nova
    # Workaround for https://bugs.launchpad.net/nova/+bug/1154809
    auth_version = v2.0
```
</li>

<li><p>Modify the <code>/etc/nova/nova.conf</code> like this:</p>

```bash
    [DEFAULT]
    logdir=/var/log/nova
    state_path=/var/lib/nova
    lock_path=/run/lock/nova
    verbose=True
    api_paste_config=/etc/nova/api-paste.ini
    compute_scheduler_driver=nova.scheduler.simple.SimpleScheduler
    rabbit_host=10.10.100.51
    nova_url=http://10.10.100.51:8774/v1.1/
    sql_connection=mysql://novaUser:novaPass@10.10.100.51/nova
    root_helper=sudo nova-rootwrap /etc/nova/rootwrap.conf

    # Auth
    use_deprecated_auth=false
    auth_strategy=keystone

    # Imaging service
    glance_api_servers=10.10.100.51:9292
    image_service=nova.image.glance.GlanceImageService

    # Vnc configuration
    novnc_enabled=true
    novncproxy_base_url=http://10.42.0.51:6080/vnc_auto.html
    novncproxy_port=6080
    vncserver_proxyclient_address=10.10.100.51
    vncserver_listen=0.0.0.0

    # Network settings
    network_api_class=nova.network.quantumv2.api.API
    quantum_url=http://10.10.100.51:9696
    quantum_auth_strategy=keystone
    quantum_admin_tenant_name=service
    quantum_admin_username=quantum
    quantum_admin_password=service_pass
    quantum_admin_auth_url=http://10.10.100.51:35357/v2.0
    libvirt_vif_driver=nova.virt.libvirt.vif.LibvirtHybridOVSBridgeDriver
    linuxnet_interface_driver=nova.network.linux_net.LinuxOVSInterfaceDriver
    #If you want Quantum + Nova Security groups
    firewall_driver=nova.virt.firewall.NoopFirewallDriver
    security_group_api=quantum
    #If you want Nova Security groups only, comment the two lines above and uncomment line -1-.
    #-1-firewall_driver=nova.virt.libvirt.firewall.IptablesFirewallDriver

    #Metadata
    service_quantum_metadata_proxy = True
    quantum_metadata_proxy_shared_secret = helloOpenStack
    metadata_host = 10.10.100.51
    metadata_listen = 127.0.0.1
    metadata_listen_port = 8775

    # Compute #
    compute_driver=libvirt.LibvirtDriver

    # Cinder #
    volume_api_class=nova.volume.cinder.API
    osapi_volume_listen_port=5900
```
</li>

<li><p>Edit the <code>/etc/nova/nova-compute.conf</code>:</p>

```bash
    [DEFAULT]
    libvirt_type=kvm
    libvirt_ovs_bridge=br-int
    libvirt_vif_type=ethernet
    libvirt_vif_driver=nova.virt.libvirt.vif.LibvirtHybridOVSBridgeDriver
    libvirt_use_virtio_for_bridges=True
```
</li>

<li><p>Synchronize your database:</p>

```bash
#nova-manage db sync
```
</li>
    
<li><p>Restart nova-* services:</p>

```bash
#cd /etc/init.d/; for i in $( ls nova-* ); do sudo service $i restart; done
```
</li>

<li><p>Check for the smiling faces on nova-* services to confirm your installation:</p>

```bash
#nova-manage service list
```
</li>
</ol>

##Cinder
OpenStack Block Storage (Cinder) provides persistent block level storage devices for use with OpenStack compute instances. The block storage system manages the creation, attaching and detaching of the block devices to servers.
<ol>
<li><p>Install the required packages:</p>

```bash
#apt-get install -y cinder-api cinder-scheduler cinder-volume iscsitarget open-iscsi iscsitarget-dkms
```
</li>

<li><p>Configure the iscsi services:</p>

```bash
#sed -i 's/false/true/g' /etc/default/iscsitarget
```
</li>
<li><p>Restart the services:</p>

```bash
#service iscsitarget start
#service open-iscsi start
```
</li>

<li><p>Prepare a Mysql database for Cinder:</p>

```bash
    mysql -u root -p
    CREATE DATABASE cinder;
    GRANT ALL ON cinder.* TO 'cinderUser'@'%' IDENTIFIED BY 'cinderPass';
    quit;
```
</li>

<li><p>Configure <code>/etc/cinder/api-paste.ini</code> like the following:</p>

```bash
    [filter:authtoken]
    paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
    service_protocol = http
    service_host = 10.42.0.51
    service_port = 5000
    auth_host = 10.10.100.51
    auth_port = 35357
    auth_protocol = http
    admin_tenant_name = service
    admin_user = cinder
    admin_password = service_pass
```
</li>

<li><p>Edit the <code>/etc/cinder/cinder.conf</code> to:</p>

```bash
    [DEFAULT]
    rootwrap_config=/etc/cinder/rootwrap.conf
    sql_connection = mysql://cinderUser:cinderPass@10.10.100.51/cinder
    api_paste_config = /etc/cinder/api-paste.ini
    iscsi_helper=ietadm
    volume_name_template = volume-%s
    volume_group = cinder-volumes
    verbose = True
    auth_strategy = keystone
    #osapi_volume_listen_port=5900
```
</li>

<li><p>Then, synchronize your database:</p>

```bash
#cinder-manage db sync
```
</li>

<li><p>For intel machines</p>

<p>create a volume-group called "cinder-volumes" using the empty partition</p>

```bash
#system--config-lvm
#Assign the empty partition to "cinder-volumes"
```
</li>

<li><p>Restart the cinder services:</p>

```bash
#cd /etc/init.d/; for i in $( ls cinder-* ); do sudo service $i restart; done
```
</li>

<li><p>Verify if cinder services are running:</p>

```bash
#cd /etc/init.d/; for i in $( ls cinder-* ); do sudo service $i status; done
```
</li>
</ol>

##Horizon

OpenStack Dashboard (Horizon) provides administrators and users a graphical interface to access, provision and automate cloud-based resources.
The dashboard is just one way to interact with OpenStack resources.
<ol>
<li><p>To install horizon, proceed like this</p>

```bash
#apt-get -y install openstack-dashboard memcached
```
</li>

<li><p>Optional:If you don't like the OpenStack ubuntu theme, you can remove the package to disable it:</p>

```bash
#dpkg --purge openstack-dashboard-ubuntu-theme
```
</li>

<li><p>Reload Apache and memcached:</p>

```bash
#service apache2 restart; service memcached restart
```

<p>You can now access your OpenStack <code>10.42.0.51/horizon</code> with credentials <code>admin:admin_pass</code>.</p>
</li>
</ol>


##VM Creation

<ol>
<li><p>Create a external network:</p>

```bash
#quantum net-create public-net --router:external=True

Created a new network:
+---------------------------+--------------------------------------+
| Field                     | Value                                |
+---------------------------+--------------------------------------+
| admin_state_up            | True                                 |
| id                        | 21ea48fb-ee1e-46a4-b589-b3c2b359291d |
| name                      | public-net                           |
| provider:network_type     | gre                                  |
| provider:physical_network |                                      |
| provider:segmentation_id  | 1                                    |
| router:external           | True                                 |
| shared                    | False                                |
| status                    | ACTIVE                               |
| subnets                   |                                      |
| tenant_id                 | 2b942273713741b1868eb86b11e08df8     |
+---------------------------+--------------------------------------+
```
 <img src="/images/create_ext_net.png"/>
</li>


<li><p>Create a subnet:</p>

```bash
#quantum subnet-create --tenant-id 2b942273713741b1868eb86b11e08df8 --name public-net-subnet01 --gateway 10.42.0.1 public-net 10.42.0.0/24 --enable_dhcp False

Created a new subnet:
+------------------+----------------------------------------------+
| Field            | Value                                        |
+------------------+----------------------------------------------+
| allocation_pools | {"start": "10.42.0.2", "end": "10.42.0.254"} |
| cidr             | 10.42.0.0/24                                 |
| dns_nameservers  |                                              |
| enable_dhcp      | False                                        |
| gateway_ip       | 10.42.0.1                                    |
| host_routes      |                                              |
| id               | d5b8d223-c2b2-4b87-ae7c-187d37f8b762         |
| ip_version       | 4                                            |
| name             | public-net-subnet01                          |
| network_id       | 21ea48fb-ee1e-46a4-b589-b3c2b359291d         |
| tenant_id        | 2b942273713741b1868eb86b11e08df8             |
+------------------+----------------------------------------------+
```
 
<img src="/images/create_subnet_ext.png"/>
</li>

<li><p>Allocation of IP's to VM's:</p>


<p>This is not tried but, we can try allocation pool also - this command not tried , pls verify before trying.</p>

```bash
#quantum subnet-create --tenant-id 6973efb023c748d6b8a4fff747faad92 --name public-net-subnet01 --gateway 10.42.0.1 public-net 10.42.0.0/24 --enable_dhcp False --allocation-pool start=10.42.0.75,end=10.42.0.254
```
</li>

<li><p>Create a private-network:</p>

```bash
#quantum net-create private-net

Created a new network:
+---------------------------+--------------------------------------+
| Field                     | Value                                |
+---------------------------+--------------------------------------+
| admin_state_up            | True                                 |
| id                        | 428dbfc9-73e1-4e8d-88e2-471a3e91f6a6 |
| name                      | private-net                          |
| provider:network_type     | gre                                  |
| provider:physical_network |                                      |
| provider:segmentation_id  | 2                                    |
| router:external           | False                                |
| shared                    | False                                |
| status                    | ACTIVE                               |
| subnets                   |                                      |
| tenant_id                 | 2b942273713741b1868eb86b11e08df8     |
+---------------------------+--------------------------------------+
```

<img src="/images/create_pvt_net.png"/>
</li>


<li><p>Attach subnet to private network:</p>

```bash
#quantum subnet-create --name private-subnet private-net 10.0.0.0/24

Created a new subnet:
+------------------+--------------------------------------------+
| Field            | Value                                      |
+------------------+--------------------------------------------+
| allocation_pools | {"start": "10.0.0.2", "end": "10.0.0.254"} |
| cidr             | 10.0.0.0/24                                |
| dns_nameservers  |                                            |
| enable_dhcp      | True                                       |
| gateway_ip       | 10.0.0.1                                   |
| host_routes      |                                            |
| id               | 5421a4eb-5b4b-4c3e-9b56-6bb721f99653       |
| ip_version       | 4                                          |
| name             | private-subnet                             |
| network_id       | 428dbfc9-73e1-4e8d-88e2-471a3e91f6a6       |
| tenant_id        | 2b942273713741b1868eb86b11e08df8           |
+------------------+--------------------------------------------+
```
 
<img src="/images/create_subnet_pvt.png"/>
</li>

<li><p>Create router:</p>

```bash
#quantum router-create router1

Created a new router:
+-----------------------+--------------------------------------+
| Field                 | Value                                |
+-----------------------+--------------------------------------+
| admin_state_up        | True                                 |
| external_gateway_info |                                      |
| id                    | ca972d3b-788e-4e16-8552-dd335575c5c0 |
| name                  | router1                              |
| status                | ACTIVE                               |
| tenant_id             | 2b942273713741b1868eb86b11e08df8     |
+-----------------------+--------------------------------------+
```
 
<img src="/images/create_router.png"/>
</li>

<li><p>Uplink router to public network:</p>

```bash
#quantum router-gateway-set router1 public-net
```
</li>

<li><p>Attach private network to router:</p>

```bash
#quantum router-interface-add router1 private-subnet
```
 
<img src="/images/router_add_iface.png"/>
</li>

<li><p>To show the net list:</p>

```bash
#ip netns list
qrouter-ca972d3b-788e-4e16-8552-dd335575c5c0
```

```bash
#ip netns exec qrouter-ca972d3b-788e-4e16-8552-dd335575c5c0 ip addr list
10: lo: <LOOPBACK,UP,LOWER_UP> mtu 16436 qdisc noqueue state UNKNOWN 
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
11: qg-e045e129-e0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN 
    link/ether fa:16:3e:23:30:ef brd ff:ff:ff:ff:ff:ff
    inet 10.42.0.2/24 brd 10.42.0.255 scope global qg-e045e129-e0
    inet6 fe80::f816:3eff:fe23:30ef/64 scope link 
       valid_lft forever preferred_lft forever
12: qr-696c2816-7e: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN 
    link/ether fa:16:3e:c8:2f:1a brd ff:ff:ff:ff:ff:ff
    inet 10.0.0.1/24 brd 10.0.0.255 scope global qr-696c2816-7e
    inet6 fe80::f816:3eff:fec8:2f1a/64 scope link 
       valid_lft forever preferred_lft forever
```
</li>
</ol>

<ul>
<li><p>Create a Security Group:</p>
<img src="/images/create_security_group.png"/>
<img src="/images/create_security_group_desc.png"/>

</li>

<li><p>Create Keypairs:<p>
<img src="/images/create_keypair.png"/>
</li>

<li><p>Add Rule:</p>
<img src="/images/add_rule.png"/>
</li>

<li><p>Edit Security Group Rules:</p>
<img src="/images/security_group_rules.png"/>
</li>

<li><p>Access and Security</p>
<img src="/images/access_and_security.png"/>
</li>


<code>Note: Create a VM using the Horizon dashboard</code>


<li><p>Before creating a VM</p>
<img src="/images/empty_instances.png"/>
</li>

<li><p>Launch Instance:</p>
 <img src="/images/launch_instance.png"/>
</li>

<li><p>Launch Instance Keypair:</p>
 <img src="/images/launch_instance_keypair.png"/>
</li>

<li><p>Launch Instance Networking:</p>
 <img src="/images/launch_instance_networking.png"/>
</li>

<li><p>My first VM</p>
 <img src="/images/first_instance.png"/>
</li>

<li><p>Network Topology</p>
 <img src="/images/network_topology.png"/>
</li>

<li><p>To ping VM:</p>

```bash
#ip netns exec qrouter-ca972d3b-788e-4e16-8552-dd335575c5c0 ping 10.0.0.2
```
</li>

<li><p>To do ssh into VM, do the follwing:</p>

```bash
#ip netns exec qrouter-36f5ccde-1876-4554-be59-032af24c419c ssh 10.0.0.2 -l cirros
    userid: cirros
    password: cubswin:)
```
</li>

<li><p>To get all the ports listed:</p>

```bash
#quantum port-list
```
</li>

<li><p>Getting the VM Port-id for assigning Floating IP:</p>

```bash
#quantum port-list -c id -c fixed_ips -c device_owner 
```
<table>
<tr bgcolor="#bad2e9"><th>id</th><th>fixed-ips </th><th>device-owner</th></tr>
<tr>
<td>848d2e3a-ab3f-4e92-ad6d-269d793dde54</td>
<td>{"subnet_id": "6bfd8ae6-a2b9-4259-b813-4581a15c8d0f", "ip_address": "10.0.0.2"}</td>
<td> compute:None</td>
</tr>
<tr>
<td>9e069dc1-4af7-4c5f-a527-3c53d64affc6</td>
<td>{"subnet_id": "55cbc646-6271-4148-b426-a7e90619e28d", "ip_address": "10.42.0.2"}</td>
<td>network:router_gateway </td>
</tr>
<tr>
<td>b36a8a56-84db-4b2e-ab0e-2adf2cef88a4</td>
<td>{"subnet_id": "6bfd8ae6-a2b9-4259-b813-4581a15c8d0f", "ip_address": "10.0.0.3"}</td>
<td>network:dhcp </td>
</tr>
<tr>
<td>e40639e1-5986-4787-9f6c-452f608b24ff</td>
<td> {"subnet_id": "6bfd8ae6-a2b9-4259-b813-4581a15c8d0f", "ip_address": "10.0.0.1"}</td>
<td>network:router_interface </td>
</tr>
</table>

<p>The compute port-id is 848d2e3a-ab3f-4e92-ad6d-269d793dde54 , which has IP 10.0.0.2 in the private subnet id.</p>

<p>We will use this port id to create a floating IP in the Public network.</p>
```bash
848d2e3a-ab3f-4e92-ad6d-269d793dde54
```
</li>

<li><p>Alternate way to get the VM port ID:</p>

```bash
#nova list
```
</li>

<html>
<head>
</head>
<style>
table,td,th
{
border:1px solid black;
}
</style>
<body>
<table width="600">
<tr bgcolor="#bad2e9">
<th>ID</th>
<th>Name</th>
<th>Status</th>
<th>Networks</th>
</tr>
<tr >
<td>2b23d81b-b6db-4dfc-9440-ddf2ed4ef144</td>
<td >firstinstance</td>
<td>ACTIVE</td>
<td> private-net=10.0.0.2</td>
</tr>
</table>
</body>
</html>


<li><p>Now use the Device id to get the VM port ID:</p>

```bash
#quantum port-list -- --device_id  2b23d81b-b6db-4dfc-9440-ddf2ed4ef144
```
</li>

<html>
<head>
</head>
<style>
table,td,th
{
border:1px solid black;
}
</style>
<body>
<table width="800">
<tr bgcolor="#bad2e9">
<th>ID</th>
<th>Name</th>
<th>mac_address</th>
<th>fixed_ips</th>
</tr>
<tr>
<td>848d2e3a-ab3f-4e92-ad6d-269d793dde54</td>
<td></td>
<td>fa:16:3e:79:9e:c4</td>
<td>{"subnet_id": "6bfd8ae6-a2b9-4259-b813-4581a15c8d0f", "ip_address": "10.0.0.2"}</td>
</tr>
</table>
</body>
</html>



<p>You can see that we got the VM PORT ID,  848d2e3a-ab3f-4e92-ad6d-269d793dde54 which is same as in the previous case.</p>

<li><p>Now create a floating IP for the VM with port_id as given above:</p>

```bash
#quantum floatingip-list
#should return empty list, since we have not created any ip
```
</li>

<li><p>You can see subnet information with the following command:</p>

```bash
#quantum subnet-list
```
</li>


<html>
<head>
</head>
<style>
table,td,th
{
border:1px solid black;
}
</style>
<body>
<table>
<tr bgcolor="#bad2e9">
<th>ID</th>
<th>Name</th>
<th>cidr</th>
<th>allocation_pools</th>
</tr>
<tr>
<td>55cbc646-6271-4148-b426-a7e90619e28d</td>
<td>public-net-subnet01</td>
<td>10.42.0.0/24</td>
<td>{"start": "10.42.0.2", "end": "10.42.0.254"}</td>
</tr>
<tr>
<td> 6bfd8ae6-a2b9-4259-b813-4581a15c8d0f</td>
<td> private-subnet </td>
<td>10.0.0.0/24</td>
<td> {"start": "10.0.0.2", "end": "10.0.0.254"}</td>
</tr>
</table>
</body>
</html>



<li><p>Command to see specific subnet information:</p>

```bash
#quantum subnet-show  55cbc646-6271-4148-b426-a7e90619e28d
```
</li>

<li><p>Since we have not created allocation pool initially we need to update the subnet with an allocation pool:</p>
<p>But the below command is not working.</p>

```bash 
#quantum subnet-update 55cbc646-6271-4148-b426-a7e90619e28d --allocation-pool start=10.42.0.75,end=10.42.0.254 public-net 10.42.0.0/24
```
</li>

<li><p>Hence we will create floating point which is already there.</p>

```bash

#quantum floatingip-list
#quantum floatingip-create --port-id 848d2e3a-ab3f-4e92-ad6d-269d793dde54 public-net

   
    Created a new floatingip:
    +---------------------+--------------------------------------+
    | Field               | Value                                |
    +---------------------+--------------------------------------+
    | fixed_ip_address    | 10.0.0.2                             |
    | floating_ip_address | 10.42.0.3                            |
    | floating_network_id | 91cc9a4d-5c5f-4da5-8baf-7fe32f270cdb |
    | id                  | dad364f9-21eb-47c9-a29c-0489536b47eb |
    | port_id             | 848d2e3a-ab3f-4e92-ad6d-269d793dde54 |
    | router_id           | 36f5ccde-1876-4554-be59-032af24c419c |
    | tenant_id           | 6973efb023c748d6b8a4fff747faad92     |
    +---------------------+--------------------------------------+
```
</li>

<li><p>ssh the virtual machine:</p>

```bash
#ssh 10.42.0.3 -l cirros 
    The authenticity of host '10.42.0.3 (10.42.0.3)' can't be established.
    RSA key fingerprint is da:f6:87:1a:3f:b6:e9:a4:92:8b:ca:a8:b8:d5:28:0d.
    Are you sure you want to continue connecting (yes/no)? yes
    Warning: Permanently added '10.42.0.3' (RSA) to the list of known hosts.
    #cirros@10.42.0.3's password: 
    cubswin:)
    $ 
```
</li>

<li><p>Portforwarding:</p>

Enable Portforwarding on Gateway:

```bash 
#eth1 src = TCP/IP port=25920   dest ip=10.42.0.3  dest port =  22 
```
</li>

<li><p>Logging in to the VM from external network:</p>

```bash
#ssh 183.83.27.73 -p 25920 -l cirros
    The authenticity of host '10.42.0.3 (10.42.0.3)' can't be established.
    RSA key fingerprint is da:f6:87:1a:3f:b6:e9:a4:92:8b:ca:a8:b8:d5:28:0d.
    Are you sure you want to continue connecting (yes/no)? yes
    Warning: Permanently added '10.42.0.3' (RSA) to the list of known hosts.
    #cirros@10.42.0.3's password:
    cubswin:)
    $ $ 
    $ 
    $ pwd
    /home/cirros
    $ ls -al
    total 5
    drwxr-xr-x    2 cirros   cirros        1024 Jun 21 06:31 .
    drwxrwxr-x    4 root     root          1024 Oct 20  2011 ..
    -rw-------    1 cirros   cirros         119 Jun 21 07:22 .ash_history
    -rwxr-xr-x    1 cirros   cirros          43 Oct 20  2011 .profile
    -rwxr-xr-x    1 cirros   cirros          66 Oct 20  2011 .shrc
    #df -k
    Filesystem           1K-blocks      Used Available Use% Mounted on
    /dev                    248936         0    248936   0% /dev
    /dev/vda1                23797     13201      9368  58% /
    tmpfs                   252056         0    252056   0% /dev/shm
```
</li>
</ul>

















