        const invoiceCount = await Sale.countDocuments({});
        const invoiceNumber = `${String(invoiceCount).padStart(2, '0')}`;
        const newSale = new Sale({
            invoiceNumber,
            ...// other sale data
        });
