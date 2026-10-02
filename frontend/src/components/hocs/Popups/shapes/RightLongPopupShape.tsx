interface PopupProps {
  context?: React.ReactNode;
}

export function RightLongPopupShape({context}: PopupProps){
    return(
        <div className="fixed top-0 right-0 h-full w-[min(25rem,100vw)] bg-white shadow-xl z-20 p-5 overflow-y-auto">
            {context}           
        </div>
    )
    
}

