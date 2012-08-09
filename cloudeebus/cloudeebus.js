/******************************************************************************
 * Copyright 2012 Intel Corporation.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *****************************************************************************/



/*****************************************************************************/

var cloudeebus = window.cloudeebus = {};

cloudeebus.reset = function() {
	cloudeebus.sessionBus = null;
	cloudeebus.systemBus = null;
	cloudeebus.wampSession = null;
	cloudeebus.uri = null;
};


cloudeebus.log = function(msg) {
};


cloudeebus.connect = function(uri, successCB, errorCB) {
	cloudeebus.reset();
	cloudeebus.uri = uri;
	
	function onWAMPSessionConnectedCB(session) {
		cloudeebus.wampSession = session;
		cloudeebus.sessionBus = new cloudeebus.BusConnection("session", cloudeebus.wampSession);
		cloudeebus.systemBus = new cloudeebus.BusConnection("system", cloudeebus.wampSession);
		cloudeebus.log("Connected to " + cloudeebus.uri);
		if (successCB)
			successCB();
	};

	function onWAMPSessionErrorCB(code, reason) {
		if (code == ab.CONNECTION_UNSUPPORTED) {
			cloudeebus.log("Browser is not supported");
		}
		else {
			cloudeebus.log("Failed to open session, code = " + code + ", reason = " + reason);
		}
		if (errorCB)
			errorCB(reason);
	};

	return ab.connect(cloudeebus.uri, onWAMPSessionConnectedCB, onWAMPSessionErrorCB);
};


cloudeebus.SessionBus = function() {
	return cloudeebus.sessionBus;
};


cloudeebus.SystemBus = function() {
	return cloudeebus.systemBus;
};



/*****************************************************************************/

cloudeebus.BusConnection = function(name, session) {
	this.name = name;
	this.wampSession = session;
	return this;
}


cloudeebus.BusConnection.prototype.listNames = function(successCB, errorCB) {
	
	var self = this; 

	function listNamesSuccessCB(str) {
		if (successCB)
			successCB(JSON.parse(str));
	};

	function listNamesErrorCB(error) {
		cloudeebus.log("Failed to list names for bus: " + self.name);
		cloudeebus.log(error.desc);
		if (errorCB)
			errorCB(error.desc);
	};

    // call listNames with bus name
	self.wampSession.call("listNames", [self.name]).then(listNamesSuccessCB, listNamesErrorCB);
}


cloudeebus.BusConnection.prototype.getObject = function(busName, objectPath) {
	return new cloudeebus.ProxyObject(this.wampSession, this, busName, objectPath);
}



/*****************************************************************************/

cloudeebus.ProxyObject = function(session, busConnection, busName, objectPath) {
	this.wampSession = session; 
	this.busConnection = busConnection; 
	this.busName = busName; 
	this.objectPath = objectPath; 
	return this;
}


cloudeebus.ProxyObject.prototype.callMethod = function(ifName, method, args, successCB, errorCB) {
	
	var self = this; 

	function callMethodSuccessCB(str) {
		if (successCB)
			successCB(JSON.parse(str));
	};

	function callMethodErrorCB(error) {
		cloudeebus.log("Error calling method: " + method + " on object: " + self.objectPath);
		cloudeebus.log(error.desc);
		if (errorCB)
			errorCB(error.desc);
	};

    var arglist = [
		self.busConnection.name,
		self.busName,
		self.objectPath,
		ifName,
		method,
		JSON.stringify(args)
	];

    // call dbusSend with bus type, destination, object, message and arguments
    self.wampSession.call("dbusSend", arglist).then(callMethodSuccessCB, callMethodErrorCB);
}


cloudeebus.ProxyObject.prototype.connectToSignal = function(ifName, signal, successCB, errorCB) {
	
	var self = this; 

	function signalHandler(id, data) {
		cloudeebus.log("Object: " + self.objectPath + " received signal: " + signal + " id: " + id);
		if (successCB)
			successCB(JSON.parse(data));		
	};
	
	function connectToSignalSuccessCB(str) {
		cloudeebus.log("Object: " + self.objectPath + " subscribing to signal: " + str);
		self.wampSession.subscribe(str, signalHandler);
	};

	function connectToSignalErrorCB(error) {
		cloudeebus.log("Error connecting to signal: " + signal + " on object: " + self.objectPath);
		cloudeebus.log(error.desc);
		if (errorCB)
			errorCB(error.desc);
	};

    var arglist = [
		self.busConnection.name,
		self.busName,
		self.objectPath,
		ifName,
		signal
	];

    // call dbusSend with bus type, destination, object, message and arguments
    self.wampSession.call("dbusRegister", arglist).then(connectToSignalSuccessCB, connectToSignalErrorCB);
}

