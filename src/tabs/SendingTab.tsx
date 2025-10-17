import { Component, batch, createSignal, JSX, For, Show, createMemo } from "solid-js";
import { useBackend } from "../backend_interop/BackendProvider";
import { addAim, addAltusMetrum, addFeatherWeight, addFileManager, addRfd, deleteDevice, initDevicePort, startSendingLoop, stopSendingLoop } from "../backend_interop/api_calls";
import ErrorModal from "../modals/ErrorModal";
import { useModal } from "../core/ModalProvider";
import { SendingModes } from "../backend_interop/types";
import { createStore } from "solid-js/store";
import { Store } from "tauri-plugin-store-api";
import FileModal from "../modals/FilePathModal";

type comDevice = {
    id: number,
    selection: string,
}
export const [comDeviceSelections, setComDeviceSelections] = createStore<comDevice[]>([]);
let comDevicesIterator = 0;
const [sendPort, setSendPort] = createSignal<string>();
const [sendInterval, setSendInterval] = createSignal(500);
const [baud, setBaud] = createSignal(115200);
const [isSimulating, setSimulating] = createSignal(false);
const [mode, selectMode] = createSignal(SendingModes.FromCSV);
const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');

export const IterateComDevicesIterator = () => {
    return comDevicesIterator++;
}

const SendingTab: Component = () => {
    const { availableDeviceNames: availablePortNames, parsedPacketCount, sendingLoopState, comDeviceList, gotData } = useBackend();
    const { showModal } = useModal();

    const serialPortDevices = createMemo(() => 
        comDeviceList().filter(device => device.device_type === 'SerialPort')
            .sort((a, b) => sortOrder() === 'asc' ? a.id - b.id : b.id - a.id)
    );
    
    const aimXtraDevices = createMemo(() => 
        comDeviceList().filter(device => device.device_type === 'AimXtra')
            .sort((a, b) => sortOrder() === 'asc' ? a.id - b.id : b.id - a.id)
    );

    const altusMetrumDevices = createMemo(() => 
        comDeviceList().filter(device => device.device_type === 'TeleDongle')
            .sort((a, b) => sortOrder() === 'asc' ? a.id - b.id : b.id - a.id)
    );

    const featherWeightDevices = createMemo(() => 
        comDeviceList().filter(device => device.device_type === 'FeatherWeight')
            .sort((a, b) => sortOrder() === 'asc' ? a.id - b.id : b.id - a.id)
    );

    const startSimulating = async () => {
        debugger;
        batch(() => {
            setSimulating(true);
        });

        try {
            switch (sendingLoopState()?.packetsSent) {
                case undefined:
                    await startSendingLoop(sendInterval(), 0, mode(), parseInt(sendPort() ?? "0"));
                default:
                    await startSendingLoop(sendInterval(), sendingLoopState()?.packetsSent as number, mode(), parseInt(sendPort() ?? "0"));
            }
        } catch (error) {
            setSimulating(false);
            showModal(ErrorModal, {
                error: 'Failed to start simulation',
                description: '' + error,
            });
        }
    };

    const stopSimulating = async () => {
        await stopSendingLoop();
        await parseInt(sendPort() ?? "0");
        setSimulating(false);
    };

    const addFileDirectory = async (filePaths: string | string[] | null) => {
        if (Array.isArray(filePaths)) {
            for (const path of filePaths) {
                setComDeviceSelections([...comDeviceSelections, { id: comDevicesIterator++, selection: path }]);
                addFileManager(path);
            }
        } else if (filePaths != null) {
            setComDeviceSelections([...comDeviceSelections, { id: comDevicesIterator++, selection: filePaths }]);
            addFileManager(filePaths);
        }
    };

    async function applyNewSelectedPort(newSelectedDevice: string, baud: number, id: number) {
        try {
            setComDeviceSelections(device => device.id === id, "selection", () => newSelectedDevice)
            await initDevicePort(newSelectedDevice, baud, id);
        } catch (error) {
            showModal(ErrorModal, { error: 'Failed to set the active serial port', description: `${error}` });
        }
    }

    return (
        <div class="flex flex-grow gap-4">
            <div class="flex flex-grow flex-col gap-4" style = {{"flex":"3"}}>

                <button class="text-black bg-gray-200 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300
                        font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 
                        dark:border-gray-700 dark:text-white"
                    onClick={async () => {
                        const store = new Store("persistent.dat");
                        const recentPaths = (await store.get("recentSaves") || []) as string[];
                        showModal(FileModal, {
                            pathStrings: recentPaths,
                            callBack: addFileDirectory
                        });
                    }}>
                    Add Path&#40;s&#41;
                </button>
                <button class="text-black bg-gray-200 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300
                        font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 
                        dark:border-gray-700 dark:text-white" onClick={() => { setComDeviceSelections([...comDeviceSelections, { id: comDevicesIterator++, selection: "" }]); addRfd() }}>
                    Add SerialPort
                </button>
                <button class="text-black bg-gray-200 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300
                        font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 
                        dark:border-gray-700 dark:text-white" onClick={() => { setComDeviceSelections([...comDeviceSelections, { id: comDevicesIterator++, selection: "" }]); addAltusMetrum() }}>
                    Add AltusMetrum Product
                </button>
                <button class="text-black bg-gray-200 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300
                        font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 
                        dark:border-gray-700 dark:text-white" onClick={() => { setComDeviceSelections([...comDeviceSelections, { id: comDevicesIterator++, selection: "" }]); addAim() }}>
                    Add AimXtra
                </button>
                <button class="text-black bg-gray-200 hover:bg-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300
                        font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 
                        dark:border-gray-700 dark:text-white" onClick={() => { setComDeviceSelections([...comDeviceSelections, { id: comDevicesIterator++, selection: "" }]); addFeatherWeight() }}>
                    Add FeatherWeight
                </button>
                <div class="flex gap-3 overflow-x-auto pb-2" style="min-height: 200px;">
                    <div class="flex flex-col w-64 flex-shrink-0">
                        <div class="flex items-center justify-between mb-1">
                            <h4 class="text-white text-sm font-medium">SerialPort</h4>
                            <button 
                                class="px-1 py-0.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                                onClick={() => setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc')}
                            >
                                {sortOrder() === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                        <div class="flex-1 overflow-y-auto space-y-1 max-h-48">
                            <For each={serialPortDevices()}>
                                {(device) => {
                                    const globalIndex = comDeviceList().findIndex(d => d.id === device.id);
                                    return (
                                        <div class="flex items-center gap-1 p-2 bg-gray-800 dark:bg-gray-700 rounded border border-gray-600">
                                            <span class="text-white text-xs">{device.id}</span>
                                            <input 
                                                class="flex-1 px-2 py-1 bg-gray-900 dark:bg-gray-800 border border-gray-500 rounded text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                                autocomplete="off"
                                                list="dataDevices" 
                                                value={comDeviceSelections[globalIndex]?.selection ?? ""}
                                                placeholder="path..."
                                                onChange={event => {
                                                    applyNewSelectedPort((event.target as HTMLInputElement).value!, baud(), device.id)
                                                }} 
                                            />
                                            <button 
                                                class="px-1 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                                                onClick={() => {
                                                    deleteDevice(device.id);
                                                    setComDeviceSelections(comDeviceSelections.filter((_, index) => globalIndex != index));
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    );
                                }}
                            </For>
                        </div>
                    </div>
                    <div class="flex flex-col w-64 flex-shrink-0">
                        <div class="flex items-center justify-between mb-1">
                            <h4 class="text-white text-sm font-medium">AimXtra</h4>
                            <button 
                                class="px-1 py-0.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                                onClick={() => setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc')}
                            >
                                {sortOrder() === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                        <div class="flex-1 overflow-y-auto space-y-1 max-h-48">
                            <For each={aimXtraDevices()}>
                                {(device) => {
                                    const globalIndex = comDeviceList().findIndex(d => d.id === device.id);
                                    return (
                                        <div class="flex items-center gap-1 p-2 bg-gray-800 dark:bg-gray-700 rounded border border-gray-600">
                                            <span class="text-white text-xs">{device.id}</span>
                                            <input 
                                                class="flex-1 px-2 py-1 bg-gray-900 dark:bg-gray-800 border border-gray-500 rounded text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                                autocomplete="off"
                                                list="dataDevices" 
                                                value={comDeviceSelections[globalIndex]?.selection ?? ""}
                                                placeholder="path..."
                                                onChange={event => {
                                                    applyNewSelectedPort((event.target as HTMLInputElement).value!, baud(), device.id)
                                                }} 
                                            />
                                            <button 
                                                class="px-1 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                                                onClick={() => {
                                                    deleteDevice(device.id);
                                                    setComDeviceSelections(comDeviceSelections.filter((_, index) => globalIndex != index));
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    );
                                }}
                            </For>
                        </div>
                    </div>
                    <div class="flex flex-col w-64 flex-shrink-0">
                        <div class="flex items-center justify-between mb-1">
                            <h4 class="text-white text-sm font-medium">TeleDongle</h4>
                            <button 
                                class="px-1 py-0.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                                onClick={() => setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc')}
                            >
                                {sortOrder() === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                        <div class="flex-1 overflow-y-auto space-y-1 max-h-48">
                            <For each={altusMetrumDevices()}>
                                {(device) => {
                                    const globalIndex = comDeviceList().findIndex(d => d.id === device.id);
                                    return (
                                        <div class="flex items-center gap-1 p-2 bg-gray-800 dark:bg-gray-700 rounded border border-gray-600">
                                            <span class="text-white text-xs">{device.id}</span>
                                            <input 
                                                class="flex-1 px-2 py-1 bg-gray-900 dark:bg-gray-800 border border-gray-500 rounded text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                                autocomplete="off"
                                                list="dataDevices" 
                                                value={comDeviceSelections[globalIndex]?.selection ?? ""}
                                                placeholder="path..."
                                onChange={event => {
                                                    applyNewSelectedPort((event.target as HTMLInputElement).value!, baud(), device.id)
                                                }} 
                                            />
                                            <button 
                                                class="px-1 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                                                onClick={() => {
                                deleteDevice(device.id);
                                                    setComDeviceSelections(comDeviceSelections.filter((_, index) => globalIndex != index));
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    );
                                }}
                            </For>
                        </div>
                    </div>
                    <div class="flex flex-col w-64 flex-shrink-0">
                        <div class="flex items-center justify-between mb-1">
                            <h4 class="text-white text-sm font-medium">FeatherWeight</h4>
                            <button 
                                class="px-1 py-0.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                                onClick={() => setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc')}
                            >
                                {sortOrder() === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                        <div class="flex-1 overflow-y-auto space-y-1 max-h-48">
                            <For each={featherWeightDevices()}>
                                {(device) => {
                                    const globalIndex = comDeviceList().findIndex(d => d.id === device.id);
                                    return (
                                        <div class="flex items-center gap-1 p-2 bg-gray-800 dark:bg-gray-700 rounded border border-gray-600">
                                            <span class="text-white text-xs">{device.id}</span>
                                            <input 
                                                class="flex-1 px-2 py-1 bg-gray-900 dark:bg-gray-800 border border-gray-500 rounded text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                                autocomplete="off"
                                                list="dataDevices" 
                                                value={comDeviceSelections[globalIndex]?.selection ?? ""}
                                                placeholder="path..."
                                                onChange={event => {
                                                    applyNewSelectedPort((event.target as HTMLInputElement).value!, baud(), device.id)
                                                }} 
                                            />
                                            <button 
                                                class="px-1 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                                                onClick={() => {
                                                    deleteDevice(device.id);
                                                    setComDeviceSelections(comDeviceSelections.filter((_, index) => globalIndex != index));
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    );
                                }}
                </For>
                        </div>
                    </div>
                </div>              

                <datalist id="dataDevices">
                    <For each={availablePortNames()}>
                        {(Device) => <option value={Device.name}/>}
                    </For>
                </datalist>
            </div>
            < div class="flex-1"/>
            {/* <div class="flex- flex-grow flex-col gap-4">
                <datalist id="radioTestAvailablePorts">
                    <For each={comDeviceList()}>
                        {(device) => <option value={device.id} />}
                    </For>
                </datalist>
                <label class="flex gap-1">
                    <span>Sending radio Device:</span>
                    <input class="border border-gray-400 rounded flex-grow dark:border-gray-600" autocomplete="off" list="radioTestAvailablePorts"
                        value={sendPort() ?? ""}
                        onChange={event => setSendPort((event.target as HTMLInputElement).value)}
                        disabled={isSimulating()} />
                </label>
                <label class="flex gap-1 items-center">
                    <span>Sending a packet every:</span>
                    <input
                        class="border border-gray-400 rounded flex-grow px-2 py-1 dark:border-gray-600"
                        type="number"
                        min={0}
                        value={sendInterval()}
                        onBeforeInput={(e) => {
                            if (e.data?.match(/[^0-9]/) ?? false) {
                                e.preventDefault();
                            }
                        }}
                        onChange={(e) => {
                            const el = e.target as HTMLInputElement;
                            const val = el.value.trim() === '' ? 500 : Math.max(0, +el.value);
                            el.value = val.toString();
                            setSendInterval(val);
                        }}
                    />
                    <span>ms</span>
                </label>
                <label>Select Mode:</label>
                <select value={mode()} onChange={e => selectMode((e.currentTarget as HTMLSelectElement).value as SendingModes)}>
                    <For each={Object.values(SendingModes).filter(k => isNaN(Number(k)))}>
                        {(mode) => <option value={mode}>{mode}</option>}
                    </For>
                </select>
                <button
                    class="py-2 px-4 rounded border-0 text-black"
                    classList={{
                        "bg-red-500": isSimulating(),
                        "bg-green-500": !isSimulating(),
                    }}
                    onClick={() => (isSimulating() ? stopSimulating() : startSimulating())}
                >
                    {isSimulating() ? "Stop Sending" : "Start Sending"}
                </button>
            </div> */}
            <div class="flex flex-2 flex-grow flex-col gap-4" style = {{"flex": "2"}}>
                <p><b>Sent: </b>{sendingLoopState()?.packetsSent} packets</p>
                <p><b>Received: </b>{parsedPacketCount()} packets</p>
                <button
                    class="py-2 px-4 rounded-lg border-0 text-white font-medium text-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900"
                    classList={{
                        "bg-red-500 hover:bg-red-700 focus:ring-red-500": !gotData(),
                        "bg-green-600 hover:bg-green-700 focus:ring-green-500": gotData(),
                    }}
                >
                    data_indicator
                </button>
                <br />
                <datalist id="commonBauds">
                    <option value="4800" />
                    <option value="9600" />
                    <option value="19200" />
                    <option value="38400" />
                    <option value="57600" />
                    <option value="115200" />
                    <option value="230400" />
                    <option value="460800" />
                    <option value="921600" />
                </datalist>
                <label class="flex gap-1 items-center">
                    <span>baud:</span>
                    <input
                        class="border border-gray-400 rounded flex-grow px-2 py-1 dark:border-gray-600"
                        list="commonBauds"
                        min={0}
                        value={baud()}
                        onBeforeInput={(e) => {
                            if (e.data?.match(/[^0-9]/) ?? false) {
                                e.preventDefault();
                            }
                        }}
                        onChange={(e) => {
                            const el = e.target as HTMLInputElement;
                            const val = el.value.trim() === '' ? 115200 : Math.max(0, +el.value);
                            el.value = val.toString();
                            setBaud(val);
                        }}
                    />
                    <span>b/s</span>
                </label>
            </div>
            < div class="flex-1"/>
        </div>
    );
};

export default SendingTab;
