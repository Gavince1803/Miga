import { AlertButton, AlertInputConfig, AlertType, CustomAlert } from '@/components/ui/CustomAlert';
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface AlertOptions {
    title: string;
    message: string;
    type?: AlertType;
    inputConfig?: AlertInputConfig;
    buttons?: AlertButton[];
}

interface AlertContextType {
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
    const [alertState, setAlertState] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: AlertType;
        inputConfig?: AlertInputConfig;
        buttons: AlertButton[];
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        inputConfig: undefined,
        buttons: [],
    });

    const showAlert = useCallback(({ title, message, type = 'info', inputConfig, buttons = [] }: AlertOptions) => {
        setAlertState({
            visible: true,
            title,
            message,
            type,
            inputConfig,
            buttons,
        });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertState(prev => ({ ...prev, visible: false }));
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <CustomAlert
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                inputConfig={alertState.inputConfig}
                buttons={alertState.buttons}
                onClose={hideAlert}
            />
        </AlertContext.Provider>
    );
}

export function useAlert() {
    const context = useContext(AlertContext);
    if (context === undefined) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
}
