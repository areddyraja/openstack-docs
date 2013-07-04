---
title: Pre-Tenant Routers With Private Network
---

Installation

#Controller Node - OpenStack Networking Server

Install the OpenStack Networking server.

Create database ovs_quantum. 


Update the OpenStack Networking configuration file, /etc/quantum/quantum.conf,
with plugin choice and Identity Service user as necessary:
```xml
    
    [DEFAULT]
    core_plugin = quantum.plugins.openvswitch.ovs_quantum_plugin.
    OVSQuantumPluginV2
    control_exchange = quantum
    rabbit_host = controlnode
    notification_driver = quantum.openstack.common.notifier.rabbit_notifier
    [keystone_authtoken]
    admin_tenant_name=servicetenant
    admin_user=quantum
    admin_password=servicepassword
```

Update the plugin configuration file, /etc/quantum/plugins/openvswitch/
ovs_quantum_plugin.ini:
```xml
    
    [DATABASE]
    sql_connection = mysql://root:root@controlnode:3306/ovs_quantum?charset=
    utf8
    [OVS]
    tenant_network_type = gre
    tunnel_id_ranges = 1:1000
    enable_tunneling = True
```
Start the OpenStack Networking server

The OpenStack Networking server can be a service of the operating system. The
command may be different to start the service on different operating systems. One
example of the command to run the OpenStack Networking server directly is:
```xml
      
     #sudo quantum-server --config-file /etc/quantum/plugins/openvswitch/
      ovs_quantum_plugin.ini --config-file /etc/quantum/quantum.conf
```
#Compute Node - OpenStack Compute

Install OpenStack Compute services.

Update the OpenStack Compute configuration file, /etc/nova/nova.conf. Make sure
the following is at the end of this file:
```xml
     
     network_api_class=nova.network.quantumv2.api.API
     quantum_admin_username=quantum
     quantum_admin_password=servicepassword
     quantum_admin_auth_url=http://controlnode:35357/v2.0/
     quantum_auth_strategy=keystone
     quantum_admin_tenant_name=servicetenant
     quantum_url=http://controlnode:9696/
     libvirt_vif_driver=nova.virt.libvirt.vif.LibvirtHybridOVSBridgeDriver
```

Restart relevant OpenStack Compute services

#Compute and Network Node - L2 Agent

Install the L2 agent.

Add the integration bridge to the Open vSwitch
```xml
     
     #sudo ovs-vsctl add-br br-int
```

Update the OpenStack Networking configuration file, /etc/quantum/quantum.conf
```xml
      
      [DEFAULT]
      core_plugin = quantum.plugins.openvswitch.ovs_quantum_plugin.
      OVSQuantumPluginV2
      control_exchange = quantum
      rabbit_host = controlnode
      notification_driver = quantum.openstack.common.notifier.rabbit_notifier
```

Update the plugin configuration file, /etc/quantum/plugins/openvswitch/
ovs_quantum_plugin.ini.
```xml
     
     Compute Node:
     [DATABASE]
     sql_connection = mysql://root:root@controlnode:3306/ovs_quantum?charset=
     utf8
     [OVS]
     tenant_network_type = gre
     tunnel_id_ranges = 1:1000
     enable_tunneling = True
     local_ip = 9.181.89.202
     Network Node:
     [DATABASE]

     sql_connection = mysql://root:root@controlnode:3306/ovs_quantum?charset= 
     utf8
     [OVS]
     tenant_network_type = gre
     tunnel_id_ranges = 1:1000
     enable_tunneling = True
     local_ip = 9.181.89.203
```

Create the integration bridge br-int:
```xml 
     #sudo ovs-vsctl --may-exist add-br br-int
```

Start the OpenStack Networking L2 agent

The OpenStack Networking Open vSwitch L2 agent can be a service of operating
system. The command may be different to start the service on different operating
systems. However the command to run it directly is kind of like:
```xml
     
     #sudo quantum-openvswitch-agent --config-file /etc/quantum/plugins/
     openvswitch/ovs_quantum_plugin.ini --config-file /etc/quantum/quantum.conf
```
#Network Node - DHCP Agent

Install the DHCP agent.

Update the OpenStack Networking configuration file, /etc/quantum/quantum.conf
```xml
     
     [DEFAULT]
     core_plugin = quantum.plugins.openvswitch.ovs_quantum_plugin.
     OVSQuantumPluginV2
     control_exchange = quantum
     rabbit_host = controlnode
     notification_driver = quantum.openstack.common.notifier.rabbit_notifier
     allow_overlapping_ips = True
```

We set allow_overlapping_ips because we have overlapping subnets for
TenantA and TenantC.

Update the DHCP configuration file /etc/quantum/dhcp_agent.ini
```xml
      interface_driver = quantum.agent.linux.interface.OVSInterfaceDriver
```

Start the DHCP agent

The OpenStack Networking DHCP agent can be a service of operating system. The
command may be different to start the service on different operating systems.
However the command to run it directly is kind of like:
```xml
      
      #sudo quantum-dhcp-agent --config-file /etc/quantum/quantum.conf --config-
      file /etc/quantum/dhcp_agent.ini
```
#Network Node - L3 Agent

Install the L3 agent.

Add the external network bridge
```xml
     #sudo ovs-vsctl add-br br-ex
```

Add the physical interface, for example eth0, that is connected to the outside network
to this bridge
```xml 
     #sudo ovs-vsctl add-port br-ex eth0
```

Update the L3 configuration file /etc/quantum/l3_agent.ini:
```xml
     
    [DEFAULT]
     interface_driver=quantum.agent.linux.interface.OVSInterfaceDriver
     use_namespaces=True
```

We set use_namespaces (It is True by default.) because we have overlapping
subnets for TenantA and TenantC and we are going to host the routers with one l3
agent network node.

Start the L3 agent

The OpenStack Networking L3 agent can be a service of operating system. The
command may be different to start the service on different operating systems.
However the command to run it directly is kind of like:
```xml
     
      #sudo quantum-l3-agent --config-file /etc/quantum/quantum.conf --config-
      file /etc/quantum/l3_agent.ini
```

#Logical Network Configuration

All of the commands below can be executed on the network node.
Note please ensure that the following environment variables are set. These are used by the
various clients to access OpenStack Identity.
```xml
     export OS_USERNAME=admin
     export OS_PASSWORD=adminpassword
     export OS_TENANT_NAME=admin
     export OS_AUTH_URL=http://127.0.0.1:5000/v2.0/
```



Get the tenant ID (Used as $TENANT_ID later)
 
     
     #keystone tenant-list

**Table 1** Tenant List


|---
|-----------------+------------+-----------------|
|Id | | Name | | Enabled |
|-----------------|:-----------|:---------------:|
|247e478c599f45b5bd297e8ddbbc9b6a | | TenantA | | True |
|-----------------+------------+-----------------|
|3719a4940bf24b5a8124b58c9b0a6ee6 | | TenantB | | True |
|=================+============+=================|
|2b4fec24e62e4ff28a8445ad83150f9d | | TenantC | | True |
|5fcfbc3283a142a5bb6978b549a511ac | | demo    | | True |
|b7445f221cda4f4a8ac7db6b218b1339 | | admin   | | True |
|---




Command to get the user information
```xml 
     #keystone user-list
```

**Table 1.1** Keystone User List













|---
|| | Description |
|:-|:-:|
|Id | | 5a9149ed991744fa85f71e4aa92eb7e     5b419c74980d46a1ab184e7571a8154e 8e37cb8193cb4873a35802d257348431 
c11f6b09ed3c45c09c21cbbc23e93066  ca567c4f6c0942bdac0e011e97bddbe3 |
|Name | |demo admin UserC UserB UserA |
|Enabled | | True True True True |
|Email | |     admin@example.com |
|---



Create the external network and its subnet by admin user:
```xml

     #quantum net-create Ext-Net --provider:network_type local --router:external
     true

Created a new network:
+---------------------------+--------------------------------------+
| Field
| Value
|
+---------------------------+--------------------------------------+
| admin_state_up
| True
|
| id
| 2c757c9e-d3d6-4154-9a77-336eb99bd573 |
| name
| Ext-Net
|
| provider:network_type
| local
|
| provider:physical_network |
|
| provider:segmentation_id |
|
| router:external
| True
|
| shared
| False
|
| status
| ACTIVE
|
| subnets
|
|
| tenant_id
| b7445f221cda4f4a8ac7db6b218b1339
|
+---------------------------+--------------------------------------+
  
   

     #quantum subnet-create Ext-Net 30.0.0.0/24

Created a new subnet:
+------------------+--------------------------------------------+
| Field
| Value
|
+------------------+--------------------------------------------+
| allocation_pools | {"start": "30.0.0.2", "end": "30.0.0.254"} |
| cidr
| 30.0.0.0/24
|
| dns_nameservers |
|
| enable_dhcp
| True
|
| gateway_ip
| 30.0.0.1
|
| host_routes
|
|
| id
| ba754a55-7ce8-46bb-8d97-aa83f4ffa5f9
|
| ip_version
| 4
|
| name
|
|
| network_id
| 2c757c9e-d3d6-4154-9a77-336eb99bd573
|
| tenant_id
| b7445f221cda4f4a8ac7db6b218b1339
|
+------------------+--------------------------------------------+
```
provider:network_type local means we don't need OpenStack Networking
to realize this network through provider network. router:external true means
we are creating an external network, on which we can create floating ip and router
gateway port.


Add an IP on external network to br-ex

Since we are using br-ex as our external network bridge, we will add an IP 30.0.0.100/24
to br-ex and then ping our VM's floating IP from our network node.
```xml 
     
     #sudo ip addr add 30.0.0.100/24 dev br-ex
     #sudo ip link set br-ex up
```
##Server TenantA

For TenantA, we will create a private network, a subnet, a server, a router and a floating
IP.
Create a network for TenantA
```xml
     
     #quantum --os-tenant-name TenantA --os-username UserA --os-password
     password --os-auth-url=http://localhost:5000/v2.0 net-create TenantA-Net

Created a new network:
+-----------------+--------------------------------------+
| Field
| Value
|
+-----------------+--------------------------------------+
| admin_state_up | True
|
| id
| 7d0e8d5d-c63c-4f13-a117-4dc4e33e7d68 |
| name
| TenantA-Net
|
| router:external | False
|
| shared
| False
|
| status
| ACTIVE
|
| subnets
|
|
| tenant_id
| 247e478c599f45b5bd297e8ddbbc9b6a
|
+-----------------+--------------------------------------+
```

After that we can use admin user to query the network's provider network
information:
```xml
     
     #quantum net-show TenantA-Net

+---------------------------+--------------------------------------+
| Field
| Value
|
+---------------------------+--------------------------------------+
| admin_state_up
| True
|
| id
| 7d0e8d5d-c63c-4f13-a117-4dc4e33e7d68 |
| name
| TenantA-Net
|
| provider:network_type
| gre
|
| provider:physical_network |
|
| provider:segmentation_id | 1
|
| router:external
| False
|
| shared
| False
|
| status
| ACTIVE
|
| subnets
|
|
| tenant_id
| 247e478c599f45b5bd297e8ddbbc9b6a
|
+---------------------------+--------------------------------------+
```

We can see that it has GRE tunnel ID (I.E. provider:segmentation_id) 1.

Create a subnet on the network TenantA-Net
```xml
     
     #quantum --os-tenant-name TenantA --os-username UserA --os-password
     password --os-auth-url=http://localhost:5000/v2.0 subnet-create TenantA-
     Net 10.0.0.0/24

Created a new subnet:
+------------------+--------------------------------------------+
| Field
| Value
|
+------------------+--------------------------------------------+
| allocation_pools | {"start": "10.0.0.2", "end": "10.0.0.254"} |
| cidr
| 10.0.0.0/24
|
| dns_nameservers |
|
| enable_dhcp
| True
|
| gateway_ip
| 10.0.0.1
|
| host_routes
|
|
| id
| 51e2c223-0492-4385-b6e9-83d4e6d10657
|
| ip_version
| 4
|
| name
|
|
| network_id
| 7d0e8d5d-c63c-4f13-a117-4dc4e33e7d68
|
| tenant_id
| 247e478c599f45b5bd297e8ddbbc9b6a
|
+------------------+--------------------------------------------+
```

Create a server for TenantA
```xml
     
     #nova --os-tenant-name TenantA --os-username UserA --os-password password
     --os-auth-url=http://localhost:5000/v2.0 boot --image tty --flavor 1 --
     nic net-id=7d0e8d5d-c63c-4f13-a117-4dc4e33e7d68 TenantA_VM1
     nova --os-tenant-name TenantA --os-username UserA --os-password password
     --os-auth-url=http://localhost:5000/v2.0 list

+--------------------------------------+-------------+--------
+----------------------+
| ID
| Name
| Status | Networks
|
+--------------------------------------+-------------+--------
+----------------------+
| 7c5e6499-7ef7-4e36-8216-62c2941d21ff | TenantA_VM1 | ACTIVE | TenantA-
Net=10.0.0.3 |
+--------------------------------------+-------------+--------
+----------------------+
```

Create and configure a router for TenantA:
```xml
    
     #quantum --os-tenant-name TenantA --os-username UserA --os-password
     password --os-auth-url=http://localhost:5000/v2.0 router-create TenantA-
     R1

Created a new router:
+-----------------------+--------------------------------------+
| Field
| Value
|
+-----------------------+--------------------------------------+
| admin_state_up
| True
|
| external_gateway_info |
|
| id
| 59cd02cb-6ee6-41e1-9165-d251214594fd |
| name
| TenantA-R1
|
| status
| ACTIVE
|
| tenant_id
| 247e478c599f45b5bd297e8ddbbc9b6a
|
+-----------------------+--------------------------------------+
```

Added interface to router TenantA-R1
```xml 
    
    #quantum --os-tenant-name TenantA --os-username UserA --os-password
    password --os-auth-url=http://localhost:5000/v2.0 router-interface-add
    TenantA-R1 51e2c223-0492-4385-b6e9-83d4e6d10657
    #quantum router-gateway-set TenantA-R1 Ext-Net
```
We are using admin user to run last command since our external network is owned
by admin tenant.

Associate a floating IP for TenantA_VM1

Create a floating IP
```xml 
    #quantum --os-tenant-name TenantA --os-username UserA --os-password
    password --os-auth-url=http://localhost:5000/v2.0 floatingip-create Ext-
    Net
```
Created a new floatingip:
```xml

+---------------------+--------------------------------------+
| Field
| Value
|
+---------------------+--------------------------------------+
| fixed_ip_address
|
|
| floating_ip_address | 30.0.0.2
|
| floating_network_id | 2c757c9e-d3d6-4154-9a77-336eb99bd573 |
| id
| 5a1f90ed-aa3c-4df3-82cb-116556e96bf1 |
| port_id
|
|
| router_id
|
|
| tenant_id
| 247e478c599f45b5bd297e8ddbbc9b6a
|
+---------------------+--------------------------------------+
```

Get the port ID of the VM with ID 7c5e6499-7ef7-4e36-8216-62c2941d21ff
```xml
     
     #quantum --os-tenant-name TenantA --os-username UserA --os-password
     password --os-auth-url=http://localhost:5000/v2.0 port-list -- --
     device_id 7c5e6499-7ef7-4e36-8216-62c2941d21ff

+--------------------------------------+------+-------------------
+---------------------------------------------------------------------------------
+
| id
| name | mac_address
|
fixed_ips
|
+--------------------------------------+------+-------------------
+---------------------------------------------------------------------------------
+
| 6071d430-c66e-4125-b972-9a937c427520 |
| fa:16:3e:a0:73:0d |
{"subnet_id": "51e2c223-0492-4385-b6e9-83d4e6d10657", "ip_address": "10.
0.0.3"} |
+--------------------------------------+------+-------------------
+---------------------------------------------------------------------------------
+
```

Associate the floating IP with the VM port
```xml
    
    #quantum --os-tenant-name TenantA --os-username UserA --os-password
    password --os-auth-url=http://localhost:5000/v2.0 floatingip-
    associate 5a1f90ed-aa3c-4df3-82cb-116556e96bf1 6071d430-c66e-4125-
    b972-9a937c427520
```

Associated floatingip 5a1f90ed-aa3c-4df3-82cb-116556e96bf1
```xml
    
    #quantum floatingip-list

+--------------------------------------+------------------
+---------------------+--------------------------------------+
| id
| fixed_ip_address |
floating_ip_address | port_id
|
+--------------------------------------+------------------
+---------------------+--------------------------------------+
| 5a1f90ed-aa3c-4df3-82cb-116556e96bf1 | 10.0.0.3
| 30.0.0.2
| 6071d430-c66e-4125-b972-9a937c427520 |
+--------------------------------------+------------------
+---------------------+--------------------------------------+
```

Ping the public network from the server of TenantA

In my environment, 192.168.1.0/24 is my public network connected with my physical
router, which also connects to the external network 30.0.0.0/24. With the floating IP
and virtual router, we can ping the public network within the server of tenant A:
```xml
    
    #ping 192.168.1.1
    PING 192.168.1.1 (192.168.1.1) 56(84) bytes of data.
    64 bytes from 192.168.1.1: icmp_req=1 ttl=64 time=1.74 ms
    64 bytes from 192.168.1.1: icmp_req=2 ttl=64 time=1.50 ms
    64 bytes from 192.168.1.1: icmp_req=3 ttl=64 time=1.23 ms
     (press ctrl+c)
    --- 192.168.1.1 ping statistics ---
    3 packets transmitted, 3 received, 0% packet loss, time 2003ms
    rtt min/avg/max/mdev = 1.234/1.495/1.745/0.211 ms
```

Ping floating IP of the TenantA's server
```xml
    
    #ping 30.0.0.2
    PING 30.0.0.2 (30.0.0.2) 56(84) bytes of data.
    64 bytes from 30.0.0.2: icmp_req=1 ttl=63 time=45.0 ms
    64 bytes from 30.0.0.2: icmp_req=2 ttl=63 time=0.898 ms
    64 bytes from 30.0.0.2: icmp_req=3 ttl=63 time=0.940 ms
    (press ctrl+c)
    --- 30.0.0.2 ping statistics ---
    3 packets transmitted, 3 received, 0% packet loss, time 2002ms
    rtt min/avg/max/mdev = 0.898/15.621/45.027/20.793 ms
```

Create other servers for TenantA

We can create more servers for TenantA and add floating IPs for them.

Serve TenantC

For TenantC, we will create two private networks with subnet 10.0.0.0/24 and subnet
10.0.1.0/24, some servers, one router to connect to these two subnets and some floating
IPs.

Create networks and subnets for TenantC
```xml
    
    #quantum --os-tenant-name TenantC --os-username UserC --os-password
    password --os-auth-url=http://localhost:5000/v2.0 net-create TenantC-
    Net1
    #quantum --os-tenant-name TenantC --os-username UserC --os-password
    password --os-auth-url=http://localhost:5000/v2.0 subnet-create TenantC-
    Net1 10.0.0.0/24 --name TenantC-Subnet1
    #quantum --os-tenant-name TenantC --os-username UserC --os-password
    password --os-auth-url=http://localhost:5000/v2.0 net-create TenantC-
    Net2

    #quantum --os-tenant-name TenantC --os-username UserC --os-password
    password --os-auth-url=http://localhost:5000/v2.0 subnet-create TenantC-
    Net2 10.0.1.0/24 --name TenantC-Subnet2
```

After that we can use admin user to query the network's provider network
information:
```xml
    
    #quantum net-show TenantC-Net1

+---------------------------+--------------------------------------+
| Field
| Value
|
+---------------------------+--------------------------------------+
| admin_state_up
| True
|
| id
| 91309738-c317-40a3-81bb-bed7a3917a85 |
| name
| TenantC-Net1
|
| provider:network_type
| gre
|
| provider:physical_network |
|
| provider:segmentation_id | 2
|
| router:external
| False
|
| shared
| False
|
| status
| ACTIVE
|
| subnets
| cf03fd1e-164b-4527-bc87-2b2631634b83 |
| tenant_id
| 2b4fec24e62e4ff28a8445ad83150f9d
|
+---------------------------+--------------------------------------+

    #quantum net-show TenantC-Net2

+---------------------------+--------------------------------------+
| Field
| Value
|
+---------------------------+--------------------------------------+
| admin_state_up
| True
|
| id
| 5b373ad2-7866-44f4-8087-f87148abd623 |
| name
| TenantC-Net2
|
| provider:network_type
| gre
|
| provider:physical_network |
|
| provider:segmentation_id | 3
|
| router:external
| False
|
| shared
| False
|
| status
| ACTIVE
|
| subnets
| 38f0b2f0-9f98-4bf6-9520-f4abede03300 |
| tenant_id
| 2b4fec24e62e4ff28a8445ad83150f9d
|
+---------------------------+--------------------------------------+
```

We can see that we have GRE tunnel IDs (I.E. provider:segmentation_id) 2 and 3. And
also note down the network IDs and subnet IDs because we will use them to create
VMs and router.

Create a server TenantC-VM1 for TenantC on TenantC-Net1
```xml
     
     #nova --os-tenant-name TenantC --os-username UserC --os-password password
     --os-auth-url=http://localhost:5000/v2.0 boot --image tty --flavor 1 --
     nic net-id=91309738-c317-40a3-81bb-bed7a3917a85 TenantC_VM1
```

Create a server TenantC-VM3 for TenantC on TenantC-Net2
```xml
     
      #nova --os-tenant-name TenantC --os-username UserC --os-password password
      --os-auth-url=http://localhost:5000/v2.0 boot --image tty --flavor 1 --
      nic net-id=5b373ad2-7866-44f4-8087-f87148abd623 TenantC_VM3

List servers of TenantC
```xml
      
      #nova --os-tenant-name TenantC --os-username UserC --os-password
      --os-auth-url=http://localhost:5000/v2.0 list

+--------------------------------------+-------------+--------
+-----------------------+
| ID
| Name
| Status |
|
+--------------------------------------+-------------+--------
+-----------------------+
| b739fa09-902f-4b37-bcb4-06e8a2506823 | TenantC_VM1 | ACTIVE |
Net1=10.0.0.3 |
| 17e255b2-b14f-48b3-ab32-5df36566d2e8 | TenantC_VM3 | ACTIVE |
Net2=10.0.1.3 |
+--------------------------------------+-------------+--------
+-----------------------+
```

Note down the server IDs since we will use them later.

Make sure servers get their IPs

We can use VNC to log on the VMs to check if they get IPs. If not, we have to make
sure the OpenStack Networking components are running right and the GRE tunnels
work.

Create and configure a router for TenantC:
```xml
    
     #quantum --os-tenant-name TenantC --os-username UserC --os-password
     password --os-auth-url=http://localhost:5000/v2.0 router-create TenantC-
     R1
     #quantum --os-tenant-name TenantC --os-username UserC --os-password
     password --os-auth-url=http://localhost:5000/v2.0 router-interface-add
     TenantC-R1 cf03fd1e-164b-4527-bc87-2b2631634b83

     #quantum --os-tenant-name TenantC --os-username UserC --os-password
     password --os-auth-url=http://localhost:5000/v2.0 router-interface-add
     TenantC-R1 38f0b2f0-9f98-4bf6-9520-f4abede03300

      #quantum router-gateway-set TenantC-R1 Ext-Net
```

We are using admin user to run last command since our external network is owned
by admin tenant.

Checkpoint: ping from within TenantC's servers

Since we have a router connecting to two subnets, the VMs on these subnets are able
to ping each other. And since we have set the router's gateway interface, TenantC's
servers are able to ping external network IPs, such as 192.168.1.1, 30.0.0.1 etc.

Associate floating IPs for TenantC's servers

We can use the similar commands as we used in TenantA's section to finish this task.

