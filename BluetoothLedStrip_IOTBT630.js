var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export var BluetoothLedStrip_IOTBT630;
(function (BluetoothLedStrip_IOTBT630) {
    let DeviceType;
    (function (DeviceType) {
        DeviceType[DeviceType["IOTBT630"] = 10] = "IOTBT630";
    })(DeviceType = BluetoothLedStrip_IOTBT630.DeviceType || (BluetoothLedStrip_IOTBT630.DeviceType = {}));

    const guidServiceLedNetWf = '0000ffff-0000-1000-8000-00805f9b34fb';
    const guidCharacteristicLedNetWf = '0000ff01-0000-1000-8000-00805f9b34fb';

    class Device {
        constructor() {
            this.deviceType = DeviceType.IOTBT630;
            this.counter = 0;
            this.lastRed = 255;
            this.lastGreen = 0;
            this.lastBlue = 0;
            this.characteristic = undefined;
            this.onError = undefined;
            this.onConnect = undefined;
            this.onDisconnect = undefined;
        }

        connect(onConnect, onDisconnect, onError) {
            return __awaiter(this, void 0, void 0, function* () {
                this.onConnect = onConnect;
                this.onDisconnect = onDisconnect;
                this.onError = onError;
                try {
                    const options = {
                        filters: [{ namePrefix: 'IOTBT630' }],
                        optionalServices: [guidServiceLedNetWf]
                    };
                    const device = yield window.navigator.bluetooth.requestDevice(options);
                    if (device != undefined)
                        console.log('Selected device: ' + device.name + ', Connected: ' + device.gatt.connected);
                    device?.addEventListener('gattserverdisconnected', this.onDisconnected);
                    if (device != undefined)
                        device.bluetoothLedStripIotbt630Device = this;
                    const server = yield device?.gatt.connect();
                    var service = undefined;
                    try {
                        service = yield server?.getPrimaryService(guidServiceLedNetWf);
                        this.deviceType = DeviceType.IOTBT630;
                        this.characteristic = yield service?.getCharacteristic(guidCharacteristicLedNetWf);
                    }
                    catch (exception) {
                        console.log('Failed to get primary service: ' + exception);
                    }
                    if (device != undefined)
                        if (this.onConnect != undefined)
                            this.onConnect(device);
                }
                catch (exception) {
                    console.log(exception);
                    if (this.onError != undefined)
                        this.onError(exception);
                }
            });
        }

        sendLedNetWf(magic, data) {
            if (this.characteristic == undefined)
                return;
            try {
                this.counter++;
                const length = magic.length + data.length;
                const packet = new Uint8Array([
                    ((this.counter >> 8) & 0xFF),
                    (this.counter & 0xFF),
                    0x80, 0x00, 0x00,
                    length,
                    (length + 1),
                    ...Uint8Array.from(magic),
                    ...data,
                    0x00
                ]);
                console.log('Sending: ' + Array.from(packet).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', '));
                this.characteristic.writeValueWithoutResponse(packet).then((_) => {});
            }
            catch (exception) {
                console.log(exception);
            }
        }

        // rgb to hsv conversion
        // based on https://stackoverflow.com/a/54070620
        // Hue is divided by two to fit into a single byte
        // Saturation and Value are percentages 0-100
        // Note: red and green are swapped for IOTBT630
        rgb2hsv(red, green, blue) {
            red /= 255;
            green /= 255;
            blue /= 255;
            let v = Math.max(red, green, blue);
            let c = v - Math.min(red, green, blue);
            let h = c && ((v == green) ? (red - blue) / c : ((v == red) ? 2 + (blue - green) / c : 4 + (green - red) / c));
            return [(60 * (h < 0 ? h + 6 : h)) / 2, (v && c / v) * 100, v * 100];
        }

        // Set RGB color
        // Note: Red and Green are swapped for IOTBT630
        setRGB(red, green, blue) {
            if (this.deviceType == DeviceType.IOTBT630) {
                this.lastRed = red;
                this.lastGreen = green;
                this.lastBlue = blue;
                const hsv = this.rgb2hsv(green, red, blue);
                this.sendLedNetWf([0x0B, 0x3B], new Uint8Array([0xA1, ...Uint8Array.from(hsv), ...new Uint8Array(7)]));
            }
        }

        // Set brightness (0-100) by overriding V in HSV of last color
        setBrightness(brightness) {
            if (this.deviceType == DeviceType.IOTBT630) {
                const hsv = this.rgb2hsv(this.lastGreen, this.lastRed, this.lastBlue);
                hsv[2] = Math.max(0, Math.min(100, brightness));
                this.sendLedNetWf([0x0B, 0x3B], new Uint8Array([0xA1, ...Uint8Array.from(hsv), ...new Uint8Array(7)]));
            }
        }

        // Set switch on/off
        setSwitch(switchBoolean) {
            if (this.deviceType == DeviceType.IOTBT630)
                this.sendLedNetWf([0x0B, 0x3B], new Uint8Array([(switchBoolean > 0) ? 0x23 : 0x24, ...new Uint8Array(10)]));
        }

        // Send raw command with magic bytes (for testing)
        sendCommandRaw(magic, data) {
            if (this.deviceType == DeviceType.IOTBT630)
                this.sendLedNetWf(magic, data);
        }

        // Device disconnect event callback
        onDisconnected(event) {
            const device = event.target;
            console.log(`Device ${device?.name} is disconnected.`);
            if (device != undefined)
                if (device.bluetoothLedStripIotbt630Device.onDisconnect != undefined)
                    device.bluetoothLedStripIotbt630Device.onDisconnect(device);
        }
    }
    BluetoothLedStrip_IOTBT630.Device = Device;
})(BluetoothLedStrip_IOTBT630 || (BluetoothLedStrip_IOTBT630 = {}));
//# sourceMappingURL=BluetoothLedStrip_IOTBT630.js.map