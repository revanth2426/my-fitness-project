package com.gym.gymmanagementsystem.service;

//import com.openhtmltopdf.pdfbox.PdfRendererBuilder;
import com.gym.gymmanagementsystem.dto.PaymentResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Service
public class PdfGenerationService {

    @Autowired
    private TemplateEngine templateEngine;

    // Arrays to store words for numbers
    private static final String[] units = {
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"
    };
    private static final String[] tens = {
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    };

    /**
     * Converts a number to its word representation.
     * This is a simple implementation for Indian currency format.
     */
    private String amountInWords(Double amount) {
        if (amount == null) {
            return "Zero";
        }
        long wholePart = amount.longValue();
        if (wholePart == 0) {
            return "Zero Rupees Only";
        }

        String result = convert(wholePart);
        return result.trim() + " Rupees Only";
    }

    private String convert(long n) {
        if (n < 20) {
            return units[(int) n];
        }
        if (n < 100) {
            return tens[(int) n / 10] + ((n % 10 != 0) ? " " : "") + units[(int) n % 10];
        }
        if (n < 1000) {
            return units[(int) n / 100] + " Hundred" + ((n % 100 != 0) ? " " : "") + convert(n % 100);
        }
        if (n < 100000) {
            return convert(n / 1000) + " Thousand" + ((n % 1000 != 0) ? " " : "") + convert(n % 1000);
        }
        if (n < 10000000) {
            return convert(n / 100000) + " Lakh" + ((n % 100000 != 0) ? " " : "") + convert(n % 100000);
        }
        return convert(n / 10000000) + " Crore" + ((n % 10000000 != 0) ? " " : "") + convert(n % 10000000);
    }

    public byte[] generatePaymentReceiptPdf(PaymentResponseDTO payment, Map<String, String> gymInfo) throws IOException {
        Context context = new Context();
        
        // Data for Thymeleaf template
        Map<String, Object> data = new HashMap<>();
        data.put("payment", payment);
        data.put("gymInfo", gymInfo);
        
        // Add formatted data fields needed by the template
        data.put("paymentDateFormatted", payment.getPaymentDate() != null ?
                payment.getPaymentDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")) : "N/A");
        
        data.put("membershipPlanNameFormatted", 
            (payment.getMembershipPlanName() != null ? payment.getMembershipPlanName() : "N/A") +
            (payment.getMembershipSession() != null ? " (" + payment.getMembershipSession() + ")" : "")
        );
        
        data.put("paymentMethodDetailFormatted", 
            payment.getPaymentMethod().equals("Online") && payment.getPaymentMethodDetail() != null ? 
            payment.getPaymentMethod() + " (" + payment.getPaymentMethodDetail() + ")" : payment.getPaymentMethod()
        );

        data.put("amountInWords", amountInWords(payment.getAmount()));
        
        context.setVariables(data);

        // Process the Thymeleaf template to get the HTML content
        String htmlContent = templateEngine.process("invoice_template.html", context);

        ByteArrayOutputStream os = new ByteArrayOutputStream();

        /*// Use OpenHTMLToPDF to convert HTML to PDF
        PdfRendererBuilder builder = new PdfRendererBuilder();
        builder.withHtmlContent(htmlContent, null); // Base URL null as it's a simple standalone HTML
        builder.toStream(os);
        try {
            builder.run();
        } catch (Exception e) {
            throw new IOException("Failed to generate PDF from HTML", e);
        }*/

        return os.toByteArray();
    }
}
