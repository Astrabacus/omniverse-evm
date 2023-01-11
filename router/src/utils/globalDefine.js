module.exports = {
    TokenOpType: {
        TRANSFER: 1,
        MINT: 3,
    },

    ErrorCode: {
        SUCCESS: 0,
        GET_MESSAGE_ERROR: 1,
        ethereum: {
            SEND_TRANSACTION_ERROR: 101,
            DECODE_DATA_ERROR: 102,
            ENCODE_DATA_ERROR: 103,
            MESSAGE_FORMAT_ERROR: 104,
            DECODE_SQOS_ERROR: 105,
            TO_CORE_MESSAGE_ERROR: 106,
            TO_EVM_MESSAGE_ERROR: 107,
            ENCODE_SQOS_ERROR: 108,
        },
        ink: {
          SEND_TRANSACTION_ERROR: 101,
          DECODE_DATA_ERROR: 102,
          MESSAGE_FORMAT_ERROR: 103,
          DECODE_SQOS_ERROR: 104,
          TO_CORE_MESSAGE_ERROR: 105,
          ENCODE_DATA_ERROR: 106,
          ENCODE_SQOS_ERROR: 107,
          TO_INK_MESSAGE_ERROR: 108,
        }
    },
    
    MsgType: {
        String: 0n,
        U8: 1n,
        U16: 2n,
        U32: 3n,
        U64: 4n,
        U128: 5n,
        I8: 6n,
        I16: 7n,
        I32: 8n,
        I64: 9n,
        I128: 10n,
        StringArray: 11n,
        U8Array: 12n,
        U16Array: 13n,
        U32Array: 14n,
        U64Array: 15n,
        U128Array: 16n,
        I8Array: 17n,
        I16Array: 18n,
        I32Array: 19n,
        I64Array: 20n,
        I128Array: 21n,
        Address: 22n,
        Bytes: 23n,
        MAX: 24n,
    },

    SQoSType: {
        Reveal: 0,
        Challenge: 1,
        Threshold: 2,
        Priority: 3,
        ExceptionRollback: 4,
        SelectionDelay: 5,
        Anonymous: 6,
        Identity: 7,
        Isolation: 8,
        CrossVerify: 9,
        MAX: 10,
    },

    ChainType: {
        EVM: 1,
        INK: 2,
        NEAR: 3,
        MAX: 4,
    }
}