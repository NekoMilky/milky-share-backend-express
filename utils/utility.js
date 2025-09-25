// 检查空值
export const checkEmptyField = (value, label) => {
    const isEmpty = value === undefined
        || value === null
        || (typeof value === "string" && value.trim() === "")
        || (Array.isArray(value) && value.length === 0);
    if (isEmpty) {
        return `${label}不能为空值`;
    }
    return null;
};
export const checkEmptyFields = (fields, labels = null) => {
    for (const [key, value] of Object.entries(fields)) {
        const label = labels[key] || key;
        const result = checkEmptyField(value, label);
        if (result) {
            return result;
        }
    }
    return null;
};
