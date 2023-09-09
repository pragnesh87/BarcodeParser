const extractDataMatrix = (code) => {
    const prefix = {
        gtin: '01',
        batch: '10',
        serial: '21',
        expiry: '17'
    };
    const response = {
        gtin: '',
        batch: '',
        serial: '',
        expiry: ''
    };

    let responseCode = cleanCodestring(code);
    responseCode = extractGTIN(responseCode);
    responseCode = extractDate(responseCode);

    const lotAndSn = extractLotAndSn(responseCode);
    response.batch = lotAndSn.batch;
    response.serial = lotAndSn.serial;

    function extractGTIN(responseCode) {
        const prefix = '01';
        const length = 14;
        const position = responseCode.indexOf(prefix);

        if (position !== -1) {
            const start = position + prefix.length;
            const end = start + length;

            response['gtin'] = responseCode.substring(start, end);
            return responseCode.slice(0, position) + responseCode.slice(end);
        }
    }

    function extractDate(responseCode, index = 0) {
        const prefix = '17';
        const length = 6;

        const f2c = responseCode.slice(0, 2);
        if (f2c == '21' || f2c == '10') {
            index = index + 2;
        }

        const position = responseCode.indexOf(prefix, index);
        if (position !== -1) {
            const start = position + prefix.length;
            const end = start + length;

            let date = responseCode.substring(start, end);
            if (isValidDate(date)) {
                response['expiry'] = date;
                return responseCode.slice(0, position) + responseCode.slice(end);
            } else {
                index = position + 1;
                return extractDate(responseCode, index);
            }
        }
    }

    return response;
};

const extractLotAndSn = (responseCode) => {
    const pattern = /^(10.+?)(?=10|21)(21.+?)$|^(21.+?)(?=10|21)(10.+?)$/;
    responseCode = cleanCodestring(responseCode);
    const matches = responseCode.match(pattern);
    if (!matches) return {
        batch: '',
        serial: ''
    };

    const [lot1, sn1, sn2, lot2] = matches.slice(1);
    const batch = (lot1 || lot2 || '').substring(2);
    const serial = (sn1 || sn2 || '').substring(2);
    return checkLotAndSn(batch, serial, responseCode);
};

const checkLotAndSn = (batch, serial, responseCode) => {
    if (responseCode.includes("1010") && !responseCode.includes("10100")) {
        const isLotStart = batch.startsWith("10");
        if (isLotStart) {
            batch = batch.slice(2);
            serial += "10";
        }
    } else if (responseCode.includes("2121") && responseCode.includes("21210")) {
        const isSnStart = serial.startsWith("21");
        if (isSnStart) {
            serial = serial.slice(2);
            batch += "21";
        }
    }

    batch = removeNonAscii(batch);
    serial = removeNonAscii(serial);

    return {
        batch,
        serial
    };
};

const removeNonAscii = (str) => {
    var fncChar = String.fromCharCode(29);
    return str.replaceAll(fncChar, '');
};

const cleanCodestring = (stringToClean) => {
    var fncChar = String.fromCharCode(29)

    var firstChar = stringToClean.slice(0, 1);
    while (firstChar === fncChar) {
        stringToClean = stringToClean.slice(1, stringToClean.length);
        firstChar = stringToClean.slice(0, 1);
    }
    return stringToClean;
};

const isValidDate = (date) => {
    if (/^\d+$/.test(date)) {
        return varifyDateMonthDay(date);
    } else {
        return false;
    }
}

const varifyDateMonthDay = (dateYYMMDD) => {
    var year = parseInt(dateYYMMDD.slice(0, 2), 10),
        month = parseInt(dateYYMMDD.slice(2, 4), 10),
        day = parseInt(dateYYMMDD.slice(4, 6), 10);

    if (month > 12 && year != 20) {
        return false;
    }
    if (day > 31) {
        return false;
    }
    return true;
}

const formatOldParserData = (data) => {
    const oldData = [];
    data.parsedCodeItems.forEach(key => {
        oldData.push({
            'ai': key.ai,
            'dataTitle': key.dataTitle,
            'data': key.data,
            'raw': key.raw
        });
    });
    return oldData;
}

const formatNewParserData = (data) => {
    const newData = [];
    Object.entries(data).forEach(([key, value]) => {
        if (key == 'gtin') {
            newData.push({
                'ai': '01',
                'dataTitle': 'GTIN',
                'data': value,
                'raw': value
            });
        } else if (key == 'expiry') {
            newData.push({
                'ai': '17',
                'dataTitle': 'USE BY OR EXPIRY',
                'data': value,
                'raw': value
            });
        } else if (key == 'batch') {
            newData.push({
                'ai': '10',
                'dataTitle': 'BATCH/LOT',
                'data': value,
                'raw': value
            });
        } else if (key == 'serial') {
            newData.push({
                'ai': '21',
                'dataTitle': 'SERIAL',
                'data': value,
                'raw': value
            });
        }
    });
    return newData;
}


