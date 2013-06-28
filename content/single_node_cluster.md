---
title: Single Node Cluster
---

Single Node Cluster
-------------------

The main goal of the document is to get a Hadoop version 2.0.3 up and running on single node cluser.

Introduction
------------

Hadoop is a framework written in Java for running applications on large clusters of commodity hardware and incorporates features similar to those of the Google File System (GFS) and of the MapReduce computing paradigm.

The tutorial has been tested with the following software versions:  

1. Ubuntu Linux 12.04 (You can download Ubuntu 12.04 from [here](http://releases.ubuntu.com/12.04/ "http://releases.ubuntu.com/12.04/" ))   
2. JDK 1.7 (Will also work with JDK 1.6)


Prerequisites
------------

The document assumes that you have installed Ubuntu 12.04 and the sytsem is up and running.

####Create a dedicated user

create a user '**gpuser**' and group '**gp**'. We will be running Hadoop with this userid  

```bash
$ sudo addgroup gpuser  
$ sudo adduser --ingroup gpuser gp
```

####JDK Installation

+ If JDK is already installed, ignore this step.
+ If not, Download JDK from [here](http://www.oracle.com/technetwork/java/javase/downloads/jdk7-downloads-1880260.html ).
+ Login with gpuser to proceed with further installation steps.  
+ Make sure JAVA_HOME is set as follows:
    (How to Set JAVA_HOME in Ubuntu is [here](setting_java_home.html).  

```bash
$ export JAVA_HOME=$HOME/java/jdk1.7.0_17 
$ export PATH=$PATH:$JAVA_HOME/bin
```

+ Verify the Java installation with the following command:

```bash
$ java -version
```